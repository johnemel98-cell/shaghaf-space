import express from 'express';
import { pool } from '../index';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get financial summary
router.get('/financial-summary', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const branchId = req.user?.role === 'admin' ? req.query.branch_id || req.user.branch_id : req.user?.branch_id;
    const { start_date, end_date } = req.query;
    
    // Validate branch_id
    if (!branchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    const dateFilter = start_date && end_date ? 
      'AND created_at >= $2 AND created_at <= $3' : '';
    const params = dateFilter ? [branchId, start_date, end_date] : [branchId];

    try {
      // Get revenue from completed bookings
      const revenueResult = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total_revenue
         FROM bookings 
         WHERE branch_id = $1 AND status = 'completed' ${dateFilter}`,
        params
      );

      // Get expenses
      const expensesResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total_expenses
         FROM expenses 
         WHERE branch_id = $1 AND approved_by IS NOT NULL ${dateFilter}`,
        params
      );

      // Get booking revenue breakdown
      const bookingRevenueResult = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as booking_revenue
         FROM bookings 
         WHERE branch_id = $1 AND status = 'completed' ${dateFilter}`,
        params
      );

      // Get membership revenue (from invoices)
      const membershipRevenueResult = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as membership_revenue
         FROM invoices 
         WHERE branch_id = $1 AND status = 'paid' AND booking_id IS NULL ${dateFilter}`,
        params
      );

      // Calculate room utilization
      const utilizationResult = await pool.query(
        `SELECT 
           COUNT(*) as total_bookings,
           COUNT(DISTINCT room_id) as rooms_used,
           (SELECT COUNT(*) FROM rooms WHERE branch_id = $1 AND is_active = true) as total_rooms
         FROM bookings 
         WHERE branch_id = $1 AND status IN ('confirmed', 'completed') ${dateFilter}`,
        params
      );

      const totalRevenue = parseFloat(revenueResult.rows[0]?.total_revenue || '0') || 0;
      const totalExpenses = parseFloat(expensesResult.rows[0]?.total_expenses || '0') || 0;
      const bookingRevenue = parseFloat(bookingRevenueResult.rows[0]?.booking_revenue || '0') || 0;
      const membershipRevenue = parseFloat(membershipRevenueResult.rows[0]?.membership_revenue || '0') || 0;
      
      const utilization = utilizationResult.rows[0] || {};
      const totalRooms = parseInt(utilization.total_rooms || '0') || 0;
      const roomsUsed = parseInt(utilization.rooms_used || '0') || 0;
      const roomUtilization = totalRooms > 0 ? 
        (roomsUsed / totalRooms) * 100 : 0;

      res.json({
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: totalRevenue - totalExpenses,
        booking_revenue: bookingRevenue,
        membership_revenue: membershipRevenue,
        product_revenue: 0, // TODO: Implement product sales
        room_utilization: Math.round(roomUtilization * 100) / 100
      });
    } catch (dbError) {
      console.error('Database query error in financial-summary:', dbError);
      // Return default values if database queries fail
      res.json({
        total_revenue: 0,
        total_expenses: 0,
        net_profit: 0,
        booking_revenue: 0,
        membership_revenue: 0,
        product_revenue: 0,
        room_utilization: 0
      });
    }
  } catch (error) {
    console.error('Get financial summary error:', error);
    res.json({
      total_revenue: 0,
      total_expenses: 0,
      net_profit: 0,
      booking_revenue: 0,
      membership_revenue: 0,
      product_revenue: 0,
      room_utilization: 0
    });
  }
});

// Get booking statistics
router.get('/booking-stats', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const branchId = req.user?.role === 'admin' ? req.query.branch_id || req.user.branch_id : req.user?.branch_id;
    const { period = 'month' } = req.query;
    
    // Validate branch_id
    if (!branchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    let dateFormat, dateInterval;
    switch (period) {
      case 'week':
        dateFormat = 'YYYY-MM-DD';
        dateInterval = '7 days';
        break;
      case 'year':
        dateFormat = 'YYYY-MM';
        dateInterval = '12 months';
        break;
      default: // month
        dateFormat = 'YYYY-MM-DD';
        dateInterval = '30 days';
    }

    try {
      const result = await pool.query(
        `SELECT 
           TO_CHAR(created_at, $2) as period,
           COUNT(*) as bookings,
           COALESCE(SUM(total_amount), 0) as revenue,
           COUNT(DISTINCT client_id) as unique_clients
         FROM bookings 
         WHERE branch_id = $1 AND created_at >= NOW() - INTERVAL $3
         GROUP BY TO_CHAR(created_at, $2)
         ORDER BY period`,
        [branchId, dateFormat, dateInterval]
      );

      // Ensure all values are properly parsed
      const processedResults = result.rows.map(row => ({
        period: row.period || '',
        bookings: parseInt(row.bookings || '0') || 0,
        revenue: parseFloat(row.revenue || '0') || 0,
        unique_clients: parseInt(row.unique_clients || '0') || 0
      }));

      res.json(processedResults);
    } catch (dbError) {
      console.error('Database query error in booking-stats:', dbError);
      // Return empty array if database query fails
      res.json([]);
    }

  } catch (error) {
    console.error('Get booking stats error:', error);
    // Return empty array for any other errors
    res.json([]);
  }
});

// Get client statistics
router.get('/client-stats', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const branchId = req.user?.role === 'admin' ? req.query.branch_id || req.user.branch_id : req.user?.branch_id;
    
    const [totalClients, activeMembers, expiringMembers, loyaltyStats] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM clients WHERE branch_id = $1 AND is_active = true', [branchId]),
      pool.query(
        'SELECT COUNT(*) FROM memberships m JOIN clients c ON m.client_id = c.id WHERE c.branch_id = $1 AND m.is_active = true AND m.end_date > CURRENT_DATE',
        [branchId]
      ),
      pool.query(
        'SELECT COUNT(*) FROM memberships m JOIN clients c ON m.client_id = c.id WHERE c.branch_id = $1 AND m.is_active = true AND m.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL \'7 days\'',
        [branchId]
      ),
      pool.query(
        'SELECT COALESCE(SUM(points), 0) as total_points FROM loyalty_points lp JOIN clients c ON lp.client_id = c.id WHERE c.branch_id = $1',
        [branchId]
      )
    ]);

    res.json({
      total_clients: parseInt(totalClients.rows[0].count) || 0,
      active_members: parseInt(activeMembers.rows[0].count) || 0,
      expiring_members: parseInt(expiringMembers.rows[0].count) || 0,
      total_loyalty_points: parseInt(loyaltyStats.rows[0].total_points) || 0
    });
  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory alerts
router.get('/inventory-alerts', authenticateToken, requireRole(['admin', 'manager', 'employee']), async (req: AuthRequest, res) => {
  try {
    const branchId = req.user?.role === 'admin' ? req.query.branch_id || req.user.branch_id : req.user?.branch_id;
    
    const [lowStock, expiring] = await Promise.all([
      pool.query(
        'SELECT * FROM products WHERE branch_id = $1 AND stock_quantity <= min_stock_level AND is_active = true',
        [branchId]
      ),
      pool.query(
        'SELECT * FROM products WHERE branch_id = $1 AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL \'30 days\' AND is_active = true',
        [branchId]
      )
    ]);

    res.json({
      low_stock: lowStock.rows,
      expiring_soon: expiring.rows
    });
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
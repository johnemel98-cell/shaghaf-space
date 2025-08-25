import express from 'express';
import { pool } from '../index';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all products for user's branch
router.get('/products', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const branchId = req.user?.role === 'admin' ? req.query.branch_id || req.user.branch_id : req.user?.branch_id;
    
    const result = await pool.query(
      `SELECT p.*
       FROM products p
       WHERE p.branch_id = $1 AND p.is_active = true
       ORDER BY p.created_at DESC`,
      [branchId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock products
router.get('/products/low-stock', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const branchId = req.user?.role === 'admin' ? req.query.branch_id || req.user.branch_id : req.user?.branch_id;
    
    const result = await pool.query(
      'SELECT * FROM products WHERE branch_id = $1 AND stock_quantity <= min_stock_level AND is_active = true',
      [branchId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product
router.post('/products', authenticateToken, requireRole(['admin', 'manager', 'employee']), async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const { 
      name, category, description, price, staff_price, order_price, cost, stock_quantity, 
      min_stock_level, max_stock_level, unit, barcode, expiry_date
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const branchId = req.user?.role === 'admin' ? req.body.branch_id || req.user.branch_id : req.user?.branch_id;

    const result = await pool.query(
      `INSERT INTO products (branch_id, name, category, description, price, staff_price, order_price, cost, 
                            stock_quantity, min_stock_level, max_stock_level, unit, barcode, expiry_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [branchId, name, category, description, price, staff_price, order_price, cost, 
       stock_quantity || 0, min_stock_level || 0, max_stock_level, unit || 'piece', barcode, expiry_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/products/:id', authenticateToken, requireRole(['admin', 'manager', 'employee']), async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const { id } = req.params;
    const { 
      name, category, description, price, staff_price, order_price, cost, stock_quantity, 
      min_stock_level, max_stock_level, unit, barcode, expiry_date, is_active 
    } = req.body;

    // Check if product exists and user has permission
    const productCheck = await pool.query('SELECT branch_id FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (req.user?.role !== 'admin' && req.user?.branch_id !== productCheck.rows[0].branch_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `UPDATE products SET name = $1, category = $2, description = $3, price = $4, staff_price = $5, order_price = $6, cost = $7,
                          stock_quantity = $8, min_stock_level = $9, max_stock_level = $10,
                          unit = $11, barcode = $12, expiry_date = $13, is_active = $14
       WHERE id = $15 RETURNING *`,
      [name, category, description, price, staff_price, order_price, cost, stock_quantity, min_stock_level, 
       max_stock_level, unit, barcode, expiry_date, is_active, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all suppliers for user's branch
router.get('/suppliers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const branchId = req.user?.role === 'admin' ? req.query.branch_id || req.user.branch_id : req.user?.branch_id;
    
    const result = await pool.query(
      'SELECT * FROM suppliers WHERE branch_id = $1 AND is_active = true ORDER BY name ASC',
      [branchId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create supplier
router.post('/suppliers', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const { name, contact_person, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const branchId = req.user?.role === 'admin' ? req.body.branch_id || req.user.branch_id : req.user?.branch_id;

    const result = await pool.query(
      'INSERT INTO suppliers (branch_id, name, contact_person, phone, email, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [branchId, name, contact_person, phone, email, address]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get supplier product details
router.get('/supplier-products/:supplierId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const { supplierId } = req.params;
    
    const result = await pool.query(
      `SELECT spd.*, p.name as product_name, p.category
       FROM supplier_product_details spd
       JOIN products p ON spd.product_id = p.id
       WHERE spd.supplier_id = $1
       ORDER BY p.name`,
      [supplierId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get supplier products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add product to supplier
router.post('/supplier-products', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const { supplier_id, product_id, cost, average_delivery_days, is_preferred, notes } = req.body;

    if (!supplier_id || !product_id || !cost) {
      return res.status(400).json({ error: 'Supplier, product, and cost are required' });
    }

    const result = await pool.query(
      `INSERT INTO supplier_product_details (supplier_id, product_id, cost, average_delivery_days, is_preferred, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [supplier_id, product_id, cost, average_delivery_days || 7, is_preferred || false, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add supplier product error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'This product is already linked to this supplier' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update supplier product details
router.put('/supplier-products/:id', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const { id } = req.params;
    const { cost, average_delivery_days, is_preferred, notes } = req.body;

    const result = await pool.query(
      `UPDATE supplier_product_details 
       SET cost = $1, average_delivery_days = $2, is_preferred = $3, notes = $4
       WHERE id = $5 RETURNING *`,
      [cost, average_delivery_days, is_preferred, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update supplier product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get supplier comparison for a product
router.get('/product-suppliers/:productId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not established' });
    }

    const { productId } = req.params;
    
    const result = await pool.query(
      `SELECT spd.*, s.name as supplier_name, s.contact_person, s.phone
       FROM supplier_product_details spd
       JOIN suppliers s ON spd.supplier_id = s.id
       WHERE spd.product_id = $1
       ORDER BY spd.cost ASC`,
      [productId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get product suppliers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
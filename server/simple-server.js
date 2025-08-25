import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3001;

// Mock data
const mockUsers = [
  {
    id: '1',
    name: 'مدير النظام',
    email: 'admin@shaghaf.eg',
    role: 'admin',
    branch_id: '1',
    is_active: true
  },
  {
    id: '2',
    name: 'مدير الفرع',
    email: 'manager@shaghaf.eg',
    role: 'manager',
    branch_id: '1',
    is_active: true
  },
  {
    id: '3',
    name: 'موظف الاستقبال',
    email: 'reception@shaghaf.eg',
    role: 'reception',
    branch_id: '1',
    is_active: true
  }
];

const mockBranches = [
  {
    id: '1',
    name: 'الفرع الرئيسي',
    address: 'شارع التحرير، وسط البلد، القاهرة',
    phone: '+20101234567',
    email: 'main@shaghaf.eg',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'فرع الإسكندرية',
    address: 'شارع الكورنيش، الإسكندرية',
    phone: '+20102345678',
    email: 'alexandria@shaghaf.eg',
    is_active: true,
    created_at: '2024-02-01T00:00:00Z'
  }
];

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    const user = mockUsers.find(u => u.id === decoded.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password, branch_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = mockUsers.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const user = mockUsers.find(u => u.id === req.user?.id);
    if (user) {
      res.json({ ...user, branch_name: 'الفرع الرئيسي' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Branches routes
app.get('/api/branches', authenticateToken, (req, res) => {
  try {
    res.json(mockBranches);
  } catch (error) {
    console.error('Get branches error:', error);
    res.json(mockBranches);
  }
});

app.get('/api/branches/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user?.role !== 'admin' && req.user?.branch_id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const branch = mockBranches.find(b => b.id === id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json(branch);
  } catch (error) {
    console.error('Get branch error:', error);
    const branch = mockBranches.find(b => b.id === req.params.id);
    if (branch) {
      res.json(branch);
    } else {
      res.status(404).json({ error: 'Branch not found' });
    }
  }
});

// Other routes - return empty arrays
app.get('/api/rooms', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/clients', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/bookings', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/inventory/products', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/inventory/suppliers', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/employees', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/finance/invoices', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/finance/expenses', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/reports/financial-summary', authenticateToken, (req, res) => {
  res.json({
    total_revenue: 0,
    total_expenses: 0,
    net_profit: 0,
    booking_revenue: 0,
    membership_revenue: 0,
    product_revenue: 0,
    room_utilization: 0
  });
});

app.get('/api/reports/booking-stats', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/reports/client-stats', authenticateToken, (req, res) => {
  res.json({
    total_clients: 0,
    active_members: 0,
    expiring_members: 0,
    total_loyalty_points: 0
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: development`);
  console.log('🎯 Mock data mode - no database required');
});
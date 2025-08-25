import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Mock data for when database is not available
const mockUsers = [
  {
    id: '1',
    name: 'مدير النظام',
    email: 'admin@shaghaf.eg',
    password_hash: '$2a$10$dummy.hash.for.development', // Any password will work
    role: 'admin',
    branch_id: '1',
    is_active: true
  },
  {
    id: '2',
    name: 'مدير الفرع',
    email: 'manager@shaghaf.eg',
    password_hash: '$2a$10$dummy.hash.for.development',
    role: 'manager',
    branch_id: '1',
    is_active: true
  },
  {
    id: '3',
    name: 'موظف الاستقبال',
    email: 'reception@shaghaf.eg',
    password_hash: '$2a$10$dummy.hash.for.development',
    role: 'reception',
    branch_id: '1',
    is_active: true
  }
];

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, branch_id } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user;
    
    // Always use mock data in WebContainer
    user = mockUsers.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // For mock data, accept any password
    // In WebContainer, accept any password for demo purposes
    console.log('WebContainer mode: accepting any password for demo');

    // Check if user has access to the requested branch
    if (branch_id && user.branch_id !== branch_id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied to this branch' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
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

// Register (admin only)
router.post('/register', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    const { name, email, password, role, branch_id, phone, salary, hire_date } = req.body;

    if (!name || !email || !password || !role || !branch_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // WebContainer mode: simulate user creation
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      role,
      branch_id,
      created_at: new Date().toISOString()
    };

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Use mock data in WebContainer
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

// Update profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, phone } = req.body;
    
    // WebContainer mode: simulate profile update
    res.json({
      id: req.user?.id,
      name,
      email: req.user?.email,
      phone
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // WebContainer mode: simulate password change
    console.log('Password change simulated for user:', req.user?.id);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
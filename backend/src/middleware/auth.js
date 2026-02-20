const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { school: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is super admin
const isSuperAdmin = (req) => {
  return req.user && req.user.role === 'SUPER_ADMIN';
};

// Middleware for super admin only routes
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      message: 'This route is only accessible by Super Admin'
    });
  }
  next();
};

const requirePasswordChange = (req, res, next) => {
  if (req.user.mustChangePassword) {
    return res.status(403).json({
      message: 'Password change required',
      requirePasswordChange: true
    });
  }
  next();
};

/**
 * Internal API Key Authentication Middleware
 * Used for authenticating requests from internal services like n8n
 * 
 * Expects header: x-internal-api-key
 * Compares against INTERNAL_API_KEY environment variable
 */
const internalAuth = (req, res, next) => {
  const apiKey = req.headers['x-internal-api-key'];

  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      error: 'Internal API key is required' 
    });
  }

  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    console.error('[Auth] INTERNAL_API_KEY not configured in environment');
    return res.status(500).json({ 
      success: false, 
      error: 'Internal authentication not configured' 
    });
  }

  if (apiKey !== expectedKey) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid internal API key' 
    });
  }

  next();
};

/**
 * Optional: Combined auth that accepts either JWT or internal API key
 * Useful for endpoints that can be called by both users and internal services
 */
const flexibleAuth = async (req, res, next) => {
  // Check for internal API key first
  const internalKey = req.headers['x-internal-api-key'];
  if (internalKey) {
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (internalKey === expectedKey) {
      // Mark as internal service request
      req.isInternalService = true;
      return next();
    }
  }

  // Fall back to JWT auth
  req.isInternalService = false;
  return protect(req, res, next);
};

// Aliases for backward compatibility
const requireAuth = protect;
const requireRole = authorize;

module.exports = { 
  protect, 
  authorize, 
  requirePasswordChange, 
  isSuperAdmin, 
  superAdminOnly,
  internalAuth,
  flexibleAuth,
  requireAuth,
  requireRole
};
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get profile
router.get('/profile', userController.getProfile);

// Update profile
router.put('/profile', [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
], userController.updateProfile);

// Get dashboard stats
router.get('/dashboard', userController.getDashboardStats);

module.exports = router;
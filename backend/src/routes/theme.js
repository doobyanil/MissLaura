const express = require('express');
const router = express.Router();
const themeController = require('../controllers/themeController');
const { protect, authorize } = require('../middleware/auth');

// Get all themes
router.get('/', protect, themeController.getThemes);

// Seed default themes (Admin only, for setup)
router.post('/seed', protect, authorize('ADMIN'), themeController.seedDefaultThemes);

module.exports = router;
const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skillController');
const { protect, authorize } = require('../middleware/auth');

// Get all skills
router.get('/', protect, skillController.getSkills);

// Get skills by curriculum
router.get('/curriculum/:curriculum', protect, skillController.getSkillsByCurriculum);

// Seed default skills (Admin only, for setup)
router.post('/seed', protect, authorize('ADMIN'), skillController.seedDefaultSkills);

module.exports = router;
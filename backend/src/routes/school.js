const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const schoolController = require('../controllers/schoolController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get school details
router.get('/', schoolController.getSchool);

// Update school details (Admin only)
router.put('/', authorize('ADMIN'), [
  body('name').optional().trim().notEmpty().withMessage('School name cannot be empty'),
  body('phone').optional().trim(),
  body('address').optional().trim()
], schoolController.updateSchool);

// Upload school logo (Admin only)
router.post('/logo', authorize('ADMIN'), schoolController.upload.single('logo'), schoolController.uploadLogo);

// Teacher management (Admin only)
router.post('/teachers', authorize('ADMIN'), [
  body('name').trim().notEmpty().withMessage('Teacher name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], schoolController.createTeacher);

router.get('/teachers', authorize('ADMIN'), schoolController.getTeachers);

router.patch('/teachers/:teacherId/status', authorize('ADMIN'), [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], schoolController.updateTeacherStatus);

router.delete('/teachers/:teacherId', authorize('ADMIN'), schoolController.deleteTeacher);

module.exports = router;
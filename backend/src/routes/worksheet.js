const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const worksheetController = require('../controllers/worksheetController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Create worksheet
router.post('/', [
  body('curriculum').isIn(['INDIAN', 'IB', 'MONTESSORI']).withMessage('Invalid curriculum'),
  body('grade').notEmpty().withMessage('Grade is required'),
  body('ageGroup').notEmpty().withMessage('Age group is required'),
  body('skill').notEmpty().withMessage('Skill is required')
], worksheetController.createWorksheet);

// Get all worksheets
router.get('/', worksheetController.getWorksheets);

// Get single worksheet
router.get('/:id', worksheetController.getWorksheet);

// Delete worksheet
router.delete('/:id', worksheetController.deleteWorksheet);

// Generate PDF
router.get('/:id/pdf', worksheetController.generatePDF);

module.exports = router;
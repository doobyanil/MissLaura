const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const worksheetController = require('../controllers/worksheetController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Create curriculum-grounded worksheet
router.post('/curriculum', [
  body('board').notEmpty().withMessage('Board is required'),
  body('grade').notEmpty().withMessage('Grade is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('seedKeywords').isArray({ min: 1 }).withMessage('At least one seed keyword is required'),
  body('chunks').isArray({ min: 1 }).withMessage('At least one content chunk is required')
], worksheetController.createCurriculumWorksheet);

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

// Export to Microsoft Forms
router.get('/:id/microsoft-forms', worksheetController.exportToMicrosoftForms);

// Download CSV for Microsoft Forms
router.get('/:id/microsoft-forms/csv', worksheetController.downloadFormsCSV);

module.exports = router;
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const ingestionController = require('../controllers/ingestionController');
const { protect, authorize } = require('../middleware/auth');

// Validation rules
const uploadTextbookValidation = [
  body('boardId')
    .optional()
    .isUUID()
    .withMessage('Valid board ID is required'),
  body('grade')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Grade cannot be empty'),
  body('subject')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject cannot be empty'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty'),
  body('bookId')
    .optional()
    .isUUID()
    .withMessage('Book ID must be a valid UUID')
];

const reprocessValidation = [
  param('bookId')
    .isUUID()
    .withMessage('Invalid book ID'),
  body('detectChapters')
    .optional()
    .isBoolean()
    .withMessage('detectChapters must be a boolean'),
  body('chunkSize')
    .optional()
    .isInt({ min: 100, max: 2000 })
    .withMessage('Chunk size must be between 100 and 2000 words'),
  body('overlap')
    .optional()
    .isInt({ min: 0, max: 200 })
    .withMessage('Overlap must be between 0 and 200 words')
];

// Routes

/**
 * @route GET /api/ingestion/jobs
 * @desc Get all ingestion jobs (books with processing status)
 * @access Private (Admin, Super Admin)
 */
router.get('/jobs', protect, authorize('ADMIN', 'SUPER_ADMIN'), ingestionController.getIngestionJobs);

/**
 * @route GET /api/ingestion/status/:bookId
 * @desc Get ingestion status for a book
 * @access Private (Admin, Super Admin)
 */
router.get('/status/:bookId', protect, authorize('ADMIN', 'SUPER_ADMIN'), ingestionController.getIngestionStatus);

/**
 * @route POST /api/ingestion/preview
 * @desc Preview PDF extraction without saving
 * @access Private (Admin, Super Admin)
 */
router.post('/preview', 
  protect, 
  authorize('ADMIN', 'SUPER_ADMIN'), 
  ingestionController.upload.single('pdf'),
  ingestionController.previewExtraction
);

/**
 * @route POST /api/ingestion/upload
 * @desc Upload and process a textbook PDF
 * @access Private (Admin, Super Admin)
 */
router.post('/upload', 
  protect, 
  authorize('ADMIN', 'SUPER_ADMIN'), 
  ingestionController.upload.single('pdf'),
  uploadTextbookValidation,
  ingestionController.uploadTextbook
);

/**
 * @route POST /api/ingestion/reprocess/:bookId
 * @desc Re-process an existing textbook
 * @access Private (Admin, Super Admin)
 */
router.post('/reprocess/:bookId', 
  protect, 
  authorize('ADMIN', 'SUPER_ADMIN'), 
  reprocessValidation,
  ingestionController.reprocessTextbook
);

module.exports = router;
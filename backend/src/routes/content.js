const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const contentController = require('../controllers/contentController');
const { protect, authorize } = require('../middleware/auth');

// Validation rules
const createChunkValidation = [
  body('bookId')
    .isUUID()
    .withMessage('Valid book ID is required'),
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Chunk text is required'),
  body('chapterId')
    .optional()
    .isUUID()
    .withMessage('Chapter ID must be a valid UUID'),
  body('pageFrom')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page from must be a positive integer'),
  body('pageTo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page to must be a positive integer'),
  body('chunkIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Chunk index must be a non-negative integer')
];

const createChunksBulkValidation = [
  body('bookId')
    .isUUID()
    .withMessage('Valid book ID is required'),
  body('chunks')
    .isArray({ min: 1 })
    .withMessage('Chunks must be a non-empty array'),
  body('chunks.*.text')
    .trim()
    .notEmpty()
    .withMessage('Each chunk must have text content')
];

const updateChunkValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid chunk ID'),
  body('text')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Chunk text cannot be empty'),
  body('chapterId')
    .optional()
    .isUUID()
    .withMessage('Chapter ID must be a valid UUID'),
  body('pageFrom')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page from must be a positive integer'),
  body('pageTo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page to must be a positive integer'),
  body('chunkIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Chunk index must be a non-negative integer')
];

const retrieveContentValidation = [
  body('board')
    .trim()
    .notEmpty()
    .withMessage('Board name is required'),
  body('grade')
    .trim()
    .notEmpty()
    .withMessage('Grade is required'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required'),
  body('seedKeywords')
    .isArray({ min: 1 })
    .withMessage('Seed keywords must be a non-empty array'),
  body('chapterId')
    .optional()
    .isUUID()
    .withMessage('Chapter ID must be a valid UUID'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
];

// Routes

/**
 * @route GET /api/content/stats
 * @desc Get content statistics
 * @access Private
 */
router.get('/stats', protect, contentController.getContentStats);

/**
 * @route GET /api/content/chunks/book/:bookId
 * @desc Get all chunks for a book with pagination
 * @access Private
 */
router.get('/chunks/book/:bookId', protect, contentController.getChunksByBook);

/**
 * @route GET /api/content/chunks/:id
 * @desc Get chunk by ID
 * @access Private
 */
router.get('/chunks/:id', protect, contentController.getChunkById);

/**
 * @route POST /api/content/retrieve
 * @desc Retrieve relevant content chunks based on filters and keywords
 * @access Private
 */
router.post('/retrieve', protect, retrieveContentValidation, contentController.retrieveContent);

/**
 * @route POST /api/content/chunks
 * @desc Create a single chunk (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.post('/chunks', protect, authorize('ADMIN', 'SUPER_ADMIN'), createChunkValidation, contentController.createChunk);

/**
 * @route POST /api/content/chunks/bulk
 * @desc Create multiple chunks at once (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.post('/chunks/bulk', protect, authorize('ADMIN', 'SUPER_ADMIN'), createChunksBulkValidation, contentController.createChunksBulk);

/**
 * @route PUT /api/content/chunks/:id
 * @desc Update a chunk (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.put('/chunks/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateChunkValidation, contentController.updateChunk);

/**
 * @route DELETE /api/content/chunks/:id
 * @desc Delete a chunk (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.delete('/chunks/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), contentController.deleteChunk);

/**
 * @route DELETE /api/content/chunks/book/:bookId
 * @desc Delete all chunks for a book (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.delete('/chunks/book/:bookId', protect, authorize('ADMIN', 'SUPER_ADMIN'), contentController.deleteChunksByBook);

module.exports = router;
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const chapterController = require('../controllers/chapterController');
const { protect, authorize } = require('../middleware/auth');

// Validation rules
const createChapterValidation = [
  body('bookId')
    .isUUID()
    .withMessage('Valid book ID is required'),
  body('number')
    .isInt({ min: 1 })
    .withMessage('Chapter number must be a positive integer'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Chapter title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be at most 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters')
];

const createChaptersBulkValidation = [
  body('bookId')
    .isUUID()
    .withMessage('Valid book ID is required'),
  body('chapters')
    .isArray({ min: 1 })
    .withMessage('Chapters must be a non-empty array'),
  body('chapters.*.number')
    .isInt({ min: 1 })
    .withMessage('Each chapter number must be a positive integer'),
  body('chapters.*.title')
    .trim()
    .notEmpty()
    .withMessage('Each chapter title is required')
];

const updateChapterValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid chapter ID'),
  body('number')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Chapter number must be a positive integer'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Chapter title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be at most 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be at most 1000 characters')
];

// Routes

/**
 * @route GET /api/chapters/book/:bookId
 * @desc Get all chapters for a book
 * @access Private
 */
router.get('/book/:bookId', protect, chapterController.getChaptersByBook);

/**
 * @route GET /api/chapters/:id
 * @desc Get chapter by ID with chunks
 * @access Private
 */
router.get('/:id', protect, chapterController.getChapterById);

/**
 * @route POST /api/chapters
 * @desc Create a new chapter (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.post('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), createChapterValidation, chapterController.createChapter);

/**
 * @route POST /api/chapters/bulk
 * @desc Create multiple chapters at once (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.post('/bulk', protect, authorize('ADMIN', 'SUPER_ADMIN'), createChaptersBulkValidation, chapterController.createChaptersBulk);

/**
 * @route PUT /api/chapters/:id
 * @desc Update a chapter (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.put('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateChapterValidation, chapterController.updateChapter);

/**
 * @route DELETE /api/chapters/:id
 * @desc Delete a chapter (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.delete('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), chapterController.deleteChapter);

module.exports = router;
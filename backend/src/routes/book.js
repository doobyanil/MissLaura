const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const bookController = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/auth');

// Validation rules
const createBookValidation = [
  body('boardId')
    .isUUID()
    .withMessage('Valid board ID is required'),
  body('grade')
    .trim()
    .notEmpty()
    .withMessage('Grade is required'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be at most 255 characters'),
  body('edition')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Edition must be at most 100 characters'),
  body('publisher')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Publisher must be at most 100 characters'),
  body('isbn')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('ISBN must be at most 20 characters')
];

const updateBookValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid book ID'),
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
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be at most 255 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Routes

/**
 * @route GET /api/books
 * @desc Get all books with optional filtering
 * @access Private
 */
router.get('/', protect, bookController.getAllBooks);

/**
 * @route GET /api/books/grades/:boardId
 * @desc Get unique grades for a board
 * @access Private
 */
router.get('/grades/:boardId', protect, bookController.getGradesByBoard);

/**
 * @route GET /api/books/subjects/:boardId/:grade
 * @desc Get unique subjects for a board and grade
 * @access Private
 */
router.get('/subjects/:boardId/:grade', protect, bookController.getSubjectsByBoardAndGrade);

/**
 * @route GET /api/books/:id
 * @desc Get book by ID with chapters
 * @access Private
 */
router.get('/:id', protect, bookController.getBookById);

/**
 * @route POST /api/books
 * @desc Create a new book (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.post('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), createBookValidation, bookController.createBook);

/**
 * @route PUT /api/books/:id
 * @desc Update a book (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.put('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateBookValidation, bookController.updateBook);

/**
 * @route DELETE /api/books/:id
 * @desc Delete a book (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.delete('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), bookController.deleteBook);

module.exports = router;
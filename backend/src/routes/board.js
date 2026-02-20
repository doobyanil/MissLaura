const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const boardController = require('../controllers/boardController');
const { protect, authorize } = require('../middleware/auth');

// Validation rules
const createBoardValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Board name is required')
    .isLength({ max: 100 })
    .withMessage('Board name must be at most 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters')
];

const updateBoardValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid board ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Board name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Board name must be at most 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Routes

/**
 * @route GET /api/boards
 * @desc Get all boards
 * @access Private
 */
router.get('/', protect, boardController.getAllBoards);

/**
 * @route GET /api/boards/:id
 * @desc Get board by ID with books
 * @access Private
 */
router.get('/:id', protect, boardController.getBoardById);

/**
 * @route POST /api/boards
 * @desc Create a new board (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.post('/', protect, authorize('ADMIN', 'SUPER_ADMIN'), createBoardValidation, boardController.createBoard);

/**
 * @route PUT /api/boards/:id
 * @desc Update a board (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.put('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), updateBoardValidation, boardController.updateBoard);

/**
 * @route DELETE /api/boards/:id
 * @desc Delete a board (Admin or Super Admin)
 * @access Private (Admin, Super Admin)
 */
router.delete('/:id', protect, authorize('ADMIN', 'SUPER_ADMIN'), boardController.deleteBoard);

module.exports = router;
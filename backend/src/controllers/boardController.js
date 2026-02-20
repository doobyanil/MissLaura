const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all boards
 * GET /api/boards
 */
const getAllBoards = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    
    const where = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }
    
    const boards = await prisma.board.findMany({
      where,
      include: {
        _count: {
          select: { books: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ message: 'Failed to fetch boards', error: error.message });
  }
};

/**
 * Get board by ID
 * GET /api/boards/:id
 */
const getBoardById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        books: {
          where: { isActive: true },
          orderBy: [{ grade: 'asc' }, { subject: 'asc' }]
        }
      }
    });
    
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    res.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ message: 'Failed to fetch board', error: error.message });
  }
};

/**
 * Create a new board
 * POST /api/boards
 */
const createBoard = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Board name is required' });
    }
    
    // Check if board already exists
    const existingBoard = await prisma.board.findUnique({
      where: { name: name.trim() }
    });
    
    if (existingBoard) {
      return res.status(400).json({ message: 'Board with this name already exists' });
    }
    
    const board = await prisma.board.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });
    
    res.status(201).json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ message: 'Failed to create board', error: error.message });
  }
};

/**
 * Update a board
 * PUT /api/boards/:id
 */
const updateBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const board = await prisma.board.update({
      where: { id },
      data: updateData
    });
    
    res.json(board);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Board not found' });
    }
    console.error('Error updating board:', error);
    res.status(500).json({ message: 'Failed to update board', error: error.message });
  }
};

/**
 * Delete a board
 * DELETE /api/boards/:id
 */
const deleteBoard = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if board has books
    const booksCount = await prisma.book.count({
      where: { boardId: id }
    });
    
    if (booksCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete board with associated books. Delete the books first or deactivate the board instead.' 
      });
    }
    
    await prisma.board.delete({
      where: { id }
    });
    
    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Board not found' });
    }
    console.error('Error deleting board:', error);
    res.status(500).json({ message: 'Failed to delete board', error: error.message });
  }
};

module.exports = {
  getAllBoards,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard
};
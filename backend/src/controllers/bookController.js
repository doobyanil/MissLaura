const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

/**
 * Get all books with filtering
 * GET /api/books
 * Query params: boardId (UUID), board (name), grade, subject, activeOnly
 */
const getAllBooks = async (req, res) => {
  try {
    const { boardId, board, grade, subject, activeOnly } = req.query;
    
    const where = {};
    if (activeOnly !== 'false') {
      where.isActive = true;
    }
    
    // Support filtering by boardId (UUID) or board name
    if (boardId) {
      where.boardId = boardId;
    } else if (board) {
      // Find board by name first
      const boardRecord = await prisma.board.findFirst({
        where: { name: { equals: board, mode: 'insensitive' } }
      });
      if (boardRecord) {
        where.boardId = boardRecord.id;
      } else {
        // No matching board found, return empty
        return res.json([]);
      }
    }
    
    if (grade) where.grade = grade;
    if (subject) where.subject = subject;
    
    const books = await prisma.book.findMany({
      where,
      include: {
        board: {
          select: { id: true, name: true }
        },
        _count: {
          select: { chapters: true, chunks: true }
        }
      },
      orderBy: [
        { board: { name: 'asc' } },
        { grade: 'asc' },
        { subject: 'asc' }
      ]
    });
    
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ message: 'Failed to fetch books', error: error.message });
  }
};

/**
 * Get book by ID
 * GET /api/books/:id
 */
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        board: {
          select: { id: true, name: true }
        },
        chapters: {
          orderBy: { number: 'asc' }
        }
      }
    });
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ message: 'Failed to fetch book', error: error.message });
  }
};

/**
 * Create a new book
 * POST /api/books
 */
const createBook = async (req, res) => {
  try {
    const { boardId, grade, subject, title, edition, publisher, isbn } = req.body;
    
    if (!boardId || !grade || !subject || !title) {
      return res.status(400).json({ 
        message: 'Board ID, grade, subject, and title are required' 
      });
    }
    
    // Verify board exists
    const board = await prisma.board.findUnique({
      where: { id: boardId }
    });
    
    if (!board) {
      return res.status(400).json({ message: 'Board not found' });
    }
    
    const book = await prisma.book.create({
      data: {
        boardId,
        grade,
        subject,
        title: title.trim(),
        edition: edition?.trim() || null,
        publisher: publisher?.trim() || null,
        isbn: isbn?.trim() || null
      },
      include: {
        board: {
          select: { id: true, name: true }
        }
      }
    });
    
    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ message: 'Failed to create book', error: error.message });
  }
};

/**
 * Update a book
 * PUT /api/books/:id
 */
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { boardId, grade, subject, title, edition, publisher, isbn, isActive } = req.body;
    
    const updateData = {};
    if (boardId !== undefined) {
      // Verify board exists
      const board = await prisma.board.findUnique({ where: { id: boardId } });
      if (!board) {
        return res.status(400).json({ message: 'Board not found' });
      }
      updateData.boardId = boardId;
    }
    if (grade !== undefined) updateData.grade = grade;
    if (subject !== undefined) updateData.subject = subject;
    if (title !== undefined) updateData.title = title.trim();
    if (edition !== undefined) updateData.edition = edition?.trim() || null;
    if (publisher !== undefined) updateData.publisher = publisher?.trim() || null;
    if (isbn !== undefined) updateData.isbn = isbn?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const book = await prisma.book.update({
      where: { id },
      data: updateData,
      include: {
        board: {
          select: { id: true, name: true }
        }
      }
    });
    
    res.json(book);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Book not found' });
    }
    console.error('Error updating book:', error);
    res.status(500).json({ message: 'Failed to update book', error: error.message });
  }
};

/**
 * Delete a book
 * DELETE /api/books/:id
 */
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get book to check for file to delete
    const book = await prisma.book.findUnique({
      where: { id },
      select: { filePath: true }
    });
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Delete associated PDF file if exists
    if (book.filePath) {
      const fullPath = path.join(__dirname, '../../uploads', book.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    // Delete book (cascade will delete chapters and chunks)
    await prisma.book.delete({
      where: { id }
    });
    
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Book not found' });
    }
    console.error('Error deleting book:', error);
    res.status(500).json({ message: 'Failed to delete book', error: error.message });
  }
};

/**
 * Get unique grades for a board
 * GET /api/books/grades/:boardId
 */
const getGradesByBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    
    const grades = await prisma.book.findMany({
      where: { 
        boardId,
        isActive: true 
      },
      select: { grade: true },
      distinct: ['grade'],
      orderBy: { grade: 'asc' }
    });
    
    res.json(grades.map(g => g.grade));
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ message: 'Failed to fetch grades', error: error.message });
  }
};

/**
 * Get unique subjects for a board and grade
 * GET /api/books/subjects/:boardId/:grade
 */
const getSubjectsByBoardAndGrade = async (req, res) => {
  try {
    const { boardId, grade } = req.params;
    
    const subjects = await prisma.book.findMany({
      where: { 
        boardId,
        grade,
        isActive: true 
      },
      select: { 
        id: true,
        subject: true,
        title: true 
      },
      distinct: ['subject'],
      orderBy: { subject: 'asc' }
    });
    
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Failed to fetch subjects', error: error.message });
  }
};

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getGradesByBoard,
  getSubjectsByBoardAndGrade
};
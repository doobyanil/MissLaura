const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all chapters for a book
 * GET /api/chapters/book/:bookId
 */
const getChaptersByBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const chapters = await prisma.chapter.findMany({
      where: { bookId },
      include: {
        _count: {
          select: { chunks: true }
        }
      },
      orderBy: { number: 'asc' }
    });
    
    res.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ message: 'Failed to fetch chapters', error: error.message });
  }
};

/**
 * Get chapter by ID
 * GET /api/chapters/:id
 */
const getChapterById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        book: {
          include: {
            board: {
              select: { id: true, name: true }
            }
          }
        },
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: {
            id: true,
            text: true,
            pageFrom: true,
            pageTo: true,
            chunkIndex: true
          }
        }
      }
    });
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    
    res.json(chapter);
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ message: 'Failed to fetch chapter', error: error.message });
  }
};

/**
 * Create a new chapter
 * POST /api/chapters
 */
const createChapter = async (req, res) => {
  try {
    const { bookId, number, title, description } = req.body;
    
    if (!bookId || !number || !title) {
      return res.status(400).json({ 
        message: 'Book ID, chapter number, and title are required' 
      });
    }
    
    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });
    
    if (!book) {
      return res.status(400).json({ message: 'Book not found' });
    }
    
    // Check if chapter number already exists for this book
    const existingChapter = await prisma.chapter.findFirst({
      where: { bookId, number: parseInt(number) }
    });
    
    if (existingChapter) {
      return res.status(400).json({ 
        message: `Chapter ${number} already exists for this book` 
      });
    }
    
    const chapter = await prisma.chapter.create({
      data: {
        bookId,
        number: parseInt(number),
        title: title.trim(),
        description: description?.trim() || null
      }
    });
    
    res.status(201).json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ message: 'Failed to create chapter', error: error.message });
  }
};

/**
 * Create multiple chapters at once
 * POST /api/chapters/bulk
 */
const createChaptersBulk = async (req, res) => {
  try {
    const { bookId, chapters } = req.body;
    
    if (!bookId || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ 
        message: 'Book ID and chapters array are required' 
      });
    }
    
    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });
    
    if (!book) {
      return res.status(400).json({ message: 'Book not found' });
    }
    
    // Validate each chapter
    for (const chapter of chapters) {
      if (!chapter.number || !chapter.title) {
        return res.status(400).json({ 
          message: 'Each chapter must have a number and title' 
        });
      }
    }
    
    // Create chapters
    const createdChapters = await prisma.$transaction(
      chapters.map(chapter => 
        prisma.chapter.create({
          data: {
            bookId,
            number: parseInt(chapter.number),
            title: chapter.title.trim(),
            description: chapter.description?.trim() || null
          }
        })
      )
    );
    
    res.status(201).json(createdChapters);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'Duplicate chapter number detected' 
      });
    }
    console.error('Error creating chapters:', error);
    res.status(500).json({ message: 'Failed to create chapters', error: error.message });
  }
};

/**
 * Update a chapter
 * PUT /api/chapters/:id
 */
const updateChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, title, description } = req.body;
    
    const updateData = {};
    if (number !== undefined) {
      // Check if new number conflicts with existing
      const chapter = await prisma.chapter.findUnique({
        where: { id },
        select: { bookId: true }
      });
      
      if (chapter) {
        const existing = await prisma.chapter.findFirst({
          where: { 
            bookId: chapter.bookId, 
            number: parseInt(number),
            id: { not: id }
          }
        });
        
        if (existing) {
          return res.status(400).json({ 
            message: `Chapter ${number} already exists for this book` 
          });
        }
      }
      updateData.number = parseInt(number);
    }
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    
    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: updateData
    });
    
    res.json(updatedChapter);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    console.error('Error updating chapter:', error);
    res.status(500).json({ message: 'Failed to update chapter', error: error.message });
  }
};

/**
 * Delete a chapter
 * DELETE /api/chapters/:id
 */
const deleteChapter = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.chapter.delete({
      where: { id }
    });
    
    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    console.error('Error deleting chapter:', error);
    res.status(500).json({ message: 'Failed to delete chapter', error: error.message });
  }
};

module.exports = {
  getChaptersByBook,
  getChapterById,
  createChapter,
  createChaptersBulk,
  updateChapter,
  deleteChapter
};
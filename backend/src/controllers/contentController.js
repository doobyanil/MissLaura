const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all chunks for a book
 * GET /api/content/chunks/book/:bookId
 */
const getChunksByBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const chunks = await prisma.contentChunk.findMany({
      where: { bookId },
      include: {
        chapter: {
          select: { id: true, number: true, title: true }
        }
      },
      orderBy: [
        { chapter: { number: 'asc' } },
        { chunkIndex: 'asc' }
      ],
      skip,
      take: parseInt(limit)
    });
    
    const total = await prisma.contentChunk.count({
      where: { bookId }
    });
    
    res.json({
      chunks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching chunks:', error);
    res.status(500).json({ message: 'Failed to fetch chunks', error: error.message });
  }
};

/**
 * Get chunk by ID
 * GET /api/content/chunks/:id
 */
const getChunkById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const chunk = await prisma.contentChunk.findUnique({
      where: { id },
      include: {
        book: {
          include: {
            board: { select: { id: true, name: true } }
          }
        },
        chapter: {
          select: { id: true, number: true, title: true }
        }
      }
    });
    
    if (!chunk) {
      return res.status(404).json({ message: 'Chunk not found' });
    }
    
    res.json(chunk);
  } catch (error) {
    console.error('Error fetching chunk:', error);
    res.status(500).json({ message: 'Failed to fetch chunk', error: error.message });
  }
};

/**
 * Create a single chunk
 * POST /api/content/chunks
 */
const createChunk = async (req, res) => {
  try {
    const { bookId, chapterId, text, pageFrom, pageTo, chunkIndex } = req.body;
    
    if (!bookId || !text) {
      return res.status(400).json({ 
        message: 'Book ID and text are required' 
      });
    }
    
    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });
    
    if (!book) {
      return res.status(400).json({ message: 'Book not found' });
    }
    
    // If chapterId provided, verify it exists and belongs to book
    if (chapterId) {
      const chapter = await prisma.chapter.findFirst({
        where: { id: chapterId, bookId }
      });
      
      if (!chapter) {
        return res.status(400).json({ 
          message: 'Chapter not found or does not belong to this book' 
        });
      }
    }
    
    const chunk = await prisma.contentChunk.create({
      data: {
        bookId,
        chapterId: chapterId || null,
        text,
        pageFrom: pageFrom ? parseInt(pageFrom) : null,
        pageTo: pageTo ? parseInt(pageTo) : null,
        chunkIndex: chunkIndex ? parseInt(chunkIndex) : 0
      }
    });
    
    res.status(201).json(chunk);
  } catch (error) {
    console.error('Error creating chunk:', error);
    res.status(500).json({ message: 'Failed to create chunk', error: error.message });
  }
};

/**
 * Create multiple chunks at once
 * POST /api/content/chunks/bulk
 */
const createChunksBulk = async (req, res) => {
  try {
    const { bookId, chunks } = req.body;
    
    if (!bookId || !Array.isArray(chunks) || chunks.length === 0) {
      return res.status(400).json({ 
        message: 'Book ID and chunks array are required' 
      });
    }
    
    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });
    
    if (!book) {
      return res.status(400).json({ message: 'Book not found' });
    }
    
    // Validate each chunk
    for (const chunk of chunks) {
      if (!chunk.text) {
        return res.status(400).json({ 
          message: 'Each chunk must have text content' 
        });
      }
    }
    
    // Create chunks
    const createdChunks = await prisma.$transaction(
      chunks.map((chunk, index) => 
        prisma.contentChunk.create({
          data: {
            bookId,
            chapterId: chunk.chapterId || null,
            text: chunk.text,
            pageFrom: chunk.pageFrom ? parseInt(chunk.pageFrom) : null,
            pageTo: chunk.pageTo ? parseInt(chunk.pageTo) : null,
            chunkIndex: chunk.chunkIndex !== undefined ? parseInt(chunk.chunkIndex) : index
          }
        })
      )
    );
    
    res.status(201).json({
      message: `Created ${createdChunks.length} chunks successfully`,
      count: createdChunks.length
    });
  } catch (error) {
    console.error('Error creating chunks:', error);
    res.status(500).json({ message: 'Failed to create chunks', error: error.message });
  }
};

/**
 * Update a chunk
 * PUT /api/content/chunks/:id
 */
const updateChunk = async (req, res) => {
  try {
    const { id } = req.params;
    const { chapterId, text, pageFrom, pageTo, chunkIndex } = req.body;
    
    const updateData = {};
    if (chapterId !== undefined) updateData.chapterId = chapterId || null;
    if (text !== undefined) updateData.text = text;
    if (pageFrom !== undefined) updateData.pageFrom = pageFrom ? parseInt(pageFrom) : null;
    if (pageTo !== undefined) updateData.pageTo = pageTo ? parseInt(pageTo) : null;
    if (chunkIndex !== undefined) updateData.chunkIndex = parseInt(chunkIndex);
    
    const chunk = await prisma.contentChunk.update({
      where: { id },
      data: updateData
    });
    
    res.json(chunk);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Chunk not found' });
    }
    console.error('Error updating chunk:', error);
    res.status(500).json({ message: 'Failed to update chunk', error: error.message });
  }
};

/**
 * Delete a chunk
 * DELETE /api/content/chunks/:id
 */
const deleteChunk = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.contentChunk.delete({
      where: { id }
    });
    
    res.json({ message: 'Chunk deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Chunk not found' });
    }
    console.error('Error deleting chunk:', error);
    res.status(500).json({ message: 'Failed to delete chunk', error: error.message });
  }
};

/**
 * Delete all chunks for a book
 * DELETE /api/content/chunks/book/:bookId
 */
const deleteChunksByBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const result = await prisma.contentChunk.deleteMany({
      where: { bookId }
    });
    
    res.json({ 
      message: `Deleted ${result.count} chunks successfully`,
      count: result.count
    });
  } catch (error) {
    console.error('Error deleting chunks:', error);
    res.status(500).json({ message: 'Failed to delete chunks', error: error.message });
  }
};

/**
 * Content Retrieval API
 * POST /api/content/retrieve
 * 
 * This is the main endpoint for retrieving relevant content chunks
 * based on board, grade, subject, chapter, and seed keywords.
 */
const retrieveContent = async (req, res) => {
  try {
    const { 
      board, 
      grade, 
      subject, 
      chapterId, 
      seedKeywords, 
      limit = 5 
    } = req.body;
    
    // Validate required fields
    if (!board || !grade || !subject) {
      return res.status(400).json({ 
        message: 'Board, grade, and subject are required' 
      });
    }
    
    if (!seedKeywords || !Array.isArray(seedKeywords) || seedKeywords.length === 0) {
      return res.status(400).json({ 
        message: 'Seed keywords array is required' 
      });
    }
    
    // Find the board
    const boardRecord = await prisma.board.findFirst({
      where: {
        name: { equals: board, mode: 'insensitive' },
        isActive: true
      }
    });
    
    if (!boardRecord) {
      return res.status(404).json({ 
        message: `Board '${board}' not found` 
      });
    }
    
    // Build the base filter
    const baseFilter = {
      book: {
        boardId: boardRecord.id,
        grade: { equals: grade, mode: 'insensitive' },
        subject: { equals: subject, mode: 'insensitive' },
        isActive: true
      }
    };
    
    // Add chapter filter if provided
    if (chapterId) {
      baseFilter.chapterId = chapterId;
    }
    
    // Phase 1: Full-text search using PostgreSQL
    // Create search query from seed keywords
    const searchQuery = seedKeywords
      .map(kw => kw.trim())
      .filter(kw => kw.length > 0)
      .join(' | '); // PostgreSQL OR operator for full-text search
    
    // Perform full-text search using to_tsvector on the fly (no pre-computed column needed)
    const chunks = await prisma.$queryRaw`
      SELECT 
        cc.id, 
        cc.text, 
        cc."pageFrom", 
        cc."pageTo", 
        cc."chapterId",
        cc."bookId",
        c.number as "chapterNumber",
        c.title as "chapterTitle",
        b.title as "bookTitle",
        b.grade,
        b.subject,
        bd.name as "boardName",
        ts_rank(to_tsvector('english', cc.text), to_tsquery('english', ${searchQuery})) as rank
      FROM "ContentChunk" cc
      JOIN "Book" b ON cc."bookId" = b.id
      JOIN "Board" bd ON b."boardId" = bd.id
      LEFT JOIN "Chapter" c ON cc."chapterId" = c.id
      WHERE bd.id = ${boardRecord.id}
        AND LOWER(b.grade) = LOWER(${grade})
        AND LOWER(b.subject) = LOWER(${subject})
        AND b."isActive" = true
        ${chapterId ? prisma.Prisma.sql`AND cc."chapterId" = ${chapterId}` : prisma.Prisma.empty}
        AND to_tsvector('english', cc.text) @@ to_tsquery('english', ${searchQuery})
      ORDER BY rank DESC
      LIMIT ${parseInt(limit)}
    `;
    
    // If no results from full-text search, try a broader LIKE search
    if (chunks.length === 0) {
      const likeConditions = seedKeywords
        .map(kw => `cc.text ILIKE '%${kw.replace(/'/g, "''")}%'`)
        .join(' OR ');
      
      const fallbackChunks = await prisma.$queryRawUnsafe(`
        SELECT 
          cc.id, 
          cc.text, 
          cc."pageFrom", 
          cc."pageTo", 
          cc."chapterId",
          cc."bookId",
          c.number as "chapterNumber",
          c.title as "chapterTitle",
          b.title as "bookTitle",
          b.grade,
          b.subject,
          bd.name as "boardName"
        FROM "ContentChunk" cc
        JOIN "Book" b ON cc."bookId" = b.id
        JOIN "Board" bd ON b."boardId" = bd.id
        LEFT JOIN "Chapter" c ON cc."chapterId" = c.id
        WHERE bd.id = '${boardRecord.id}'
          AND LOWER(b.grade) = LOWER('${grade}')
          AND LOWER(b.subject) = LOWER('${subject}')
          AND b."isActive" = true
          ${chapterId ? `AND cc."chapterId" = '${chapterId}'` : ''}
          AND (${likeConditions})
        LIMIT ${parseInt(limit)}
      `);
      
      if (fallbackChunks.length === 0) {
        return res.json({ 
          chunks: [],
          message: 'No relevant content found for the given criteria'
        });
      }
      
      return res.json({
        chunks: fallbackChunks.map(chunk => ({
          id: chunk.id,
          text: chunk.text,
          pageFrom: chunk.pageFrom,
          pageTo: chunk.pageTo,
          chapter: chunk.chapterId ? {
            id: chunk.chapterId,
            number: chunk.chapterNumber,
            title: chunk.chapterTitle
          } : null,
          book: {
            id: chunk.bookId,
            title: chunk.bookTitle,
            grade: chunk.grade,
            subject: chunk.subject
          },
          board: {
            name: chunk.boardName
          }
        })),
        searchType: 'fallback'
      });
    }
    
    res.json({
      chunks: chunks.map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        pageFrom: chunk.pageFrom,
        pageTo: chunk.pageTo,
        chapter: chunk.chapterId ? {
          id: chunk.chapterId,
          number: chunk.chapterNumber,
          title: chunk.chapterTitle
        } : null,
        book: {
          id: chunk.bookId,
          title: chunk.bookTitle,
          grade: chunk.grade,
          subject: chunk.subject
        },
        board: {
          name: chunk.boardName
        },
        relevanceScore: chunk.rank
      })),
      searchType: 'fulltext'
    });
  } catch (error) {
    console.error('Error retrieving content:', error);
    res.status(500).json({ message: 'Failed to retrieve content', error: error.message });
  }
};

/**
 * Get statistics about content
 * GET /api/content/stats
 */
const getContentStats = async (req, res) => {
  try {
    const totalBoards = await prisma.board.count({
      where: { isActive: true }
    });
    
    const totalBooks = await prisma.book.count({
      where: { isActive: true }
    });
    
    const totalChapters = await prisma.chapter.count();
    
    const totalChunks = await prisma.contentChunk.count();
    
    const booksByBoard = await prisma.board.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { books: true }
        }
      }
    });
    
    res.json({
      totalBoards,
      totalBooks,
      totalChapters,
      totalChunks,
      booksByBoard: booksByBoard.map(b => ({
        id: b.id,
        name: b.name,
        bookCount: b._count.books
      }))
    });
  } catch (error) {
    console.error('Error fetching content stats:', error);
    res.status(500).json({ message: 'Failed to fetch content stats', error: error.message });
  }
};

module.exports = {
  getChunksByBook,
  getChunkById,
  createChunk,
  createChunksBulk,
  updateChunk,
  deleteChunk,
  deleteChunksByBook,
  retrieveContent,
  getContentStats
};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfService = require('../services/pdfService');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

/**
 * Upload and process a textbook PDF
 * POST /api/ingestion/upload
 * 
 * This endpoint handles the complete ingestion pipeline:
 * 1. Upload PDF
 * 2. Create/update book record
 * 3. Extract text
 * 4. Detect chapters
 * 5. Create chunks
 */
const uploadTextbook = async (req, res) => {
  try {
    const { boardId, grade, subject, title, edition, publisher, isbn, bookId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }
    
    // Either create new book or use existing
    let book;
    if (bookId) {
      book = await prisma.book.findUnique({
        where: { id: bookId }
      });
      
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }
    } else {
      // Validate required fields for new book
      if (!boardId || !grade || !subject || !title) {
        return res.status(400).json({ 
          message: 'Board ID, grade, subject, and title are required for new book' 
        });
      }
      
      // Verify board exists
      const board = await prisma.board.findUnique({
        where: { id: boardId }
      });
      
      if (!board) {
        return res.status(400).json({ message: 'Board not found' });
      }
      
      // Create book
      book = await prisma.book.create({
        data: {
          boardId,
          grade,
          subject,
          title: title.trim(),
          edition: edition?.trim() || null,
          publisher: publisher?.trim() || null,
          isbn: isbn?.trim() || null
        }
      });
    }
    
    // Save PDF file
    const { filePath } = await pdfService.savePDFFile(req.file, book.id);
    
    // Process PDF
    const result = await pdfService.processPDF({
      bookId: book.id,
      filePath,
      detectChapters: true
    });
    
    res.status(201).json({
      message: 'Textbook processed successfully',
      book: {
        id: book.id,
        title: book.title,
        grade: book.grade,
        subject: book.subject
      },
      processing: result
    });
  } catch (error) {
    console.error('Error uploading textbook:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    res.status(500).json({ 
      message: 'Failed to process textbook', 
      error: error.message 
    });
  }
};

/**
 * Re-process an existing textbook
 * POST /api/ingestion/reprocess/:bookId
 */
const reprocessTextbook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { detectChapters = true, chunkSize, overlap } = req.body;
    
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    if (!book.filePath) {
      return res.status(400).json({ 
        message: 'No PDF file associated with this book. Please upload a new file.' 
      });
    }
    
    const filePath = path.join(pdfService.UPLOAD_DIR, book.filePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ 
        message: 'PDF file not found. Please upload a new file.' 
      });
    }
    
    const result = await pdfService.processPDF({
      bookId: book.id,
      filePath,
      detectChapters,
      chunkSize,
      overlap
    });
    
    res.json({
      message: 'Textbook re-processed successfully',
      book: {
        id: book.id,
        title: book.title,
        grade: book.grade,
        subject: book.subject
      },
      processing: result
    });
  } catch (error) {
    console.error('Error re-processing textbook:', error);
    res.status(500).json({ 
      message: 'Failed to re-process textbook', 
      error: error.message 
    });
  }
};

/**
 * Get ingestion status for a book
 * GET /api/ingestion/status/:bookId
 */
const getIngestionStatus = async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        board: {
          select: { id: true, name: true }
        },
        _count: {
          select: { chapters: true, chunks: true }
        }
      }
    });
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check if PDF file exists
    let fileStats = null;
    if (book.filePath) {
      const filePath = path.join(pdfService.UPLOAD_DIR, book.filePath);
      fileStats = pdfService.getFileStats(filePath);
    }
    
    res.json({
      book: {
        id: book.id,
        title: book.title,
        grade: book.grade,
        subject: book.subject,
        board: book.board,
        hasFile: !!book.filePath,
        fileStats
      },
      counts: {
        chapters: book._count.chapters,
        chunks: book._count.chunks
      },
      status: {
        isProcessed: book._count.chunks > 0,
        hasChapters: book._count.chapters > 0
      }
    });
  } catch (error) {
    console.error('Error getting ingestion status:', error);
    res.status(500).json({ 
      message: 'Failed to get ingestion status', 
      error: error.message 
    });
  }
};

/**
 * Preview PDF extraction (without saving)
 * POST /api/ingestion/preview
 */
const previewExtraction = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }
    
    const { text, pages, metadata } = await pdfService.extractTextFromPDF(req.file.path);
    
    // Detect chapters
    const chapters = pdfService.detectChapters(text);
    
    // Get sample chunks
    const sampleChunks = pdfService.splitIntoChunks(text).slice(0, 3);
    
    // Clean up temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    res.json({
      preview: {
        totalPages: pages,
        totalCharacters: text.length,
        totalWords: text.split(/\s+/).length,
        detectedChapters: chapters.length,
        chapters: chapters.slice(0, 10),
        sampleChunks: sampleChunks.map(c => ({
          ...c,
          text: c.text.substring(0, 500) + (c.text.length > 500 ? '...' : '')
        })),
        metadata
      }
    });
  } catch (error) {
    console.error('Error previewing extraction:', error);
    
    // Clean up temp file
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    res.status(500).json({ 
      message: 'Failed to preview PDF', 
      error: error.message 
    });
  }
};

/**
 * Get all ingestion jobs (books with processing status)
 * GET /api/ingestion/jobs
 */
const getIngestionJobs = async (req, res) => {
  try {
    const { status, boardId } = req.query;
    
    const where = {};
    if (boardId) where.boardId = boardId;
    
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
        { createdAt: 'desc' }
      ]
    });
    
    // Filter by status if provided
    let filteredBooks = books;
    if (status === 'processed') {
      filteredBooks = books.filter(b => b._count.chunks > 0);
    } else if (status === 'pending') {
      filteredBooks = books.filter(b => b._count.chunks === 0);
    }
    
    res.json(filteredBooks.map(book => ({
      id: book.id,
      title: book.title,
      grade: book.grade,
      subject: book.subject,
      board: book.board,
      hasFile: !!book.filePath,
      chapters: book._count.chapters,
      chunks: book._count.chunks,
      status: book._count.chunks > 0 ? 'processed' : 'pending',
      createdAt: book.createdAt
    })));
  } catch (error) {
    console.error('Error getting ingestion jobs:', error);
    res.status(500).json({ 
      message: 'Failed to get ingestion jobs', 
      error: error.message 
    });
  }
};

module.exports = {
  upload,
  uploadTextbook,
  reprocessTextbook,
  getIngestionStatus,
  previewExtraction,
  getIngestionJobs
};
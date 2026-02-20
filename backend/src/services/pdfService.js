const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration
const UPLOAD_DIR = path.join(__dirname, '../../uploads/textbooks');
const CHUNK_SIZE_WORDS = 800; // Target words per chunk
const CHUNK_OVERLAP_WORDS = 50; // Overlap between chunks for context

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Extract text from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{text: string, pages: number, metadata: object}>}
 */
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    
    const data = await pdf(dataBuffer, {
      // Optional: custom page rendering
      pagerender: (pageData) => {
        return pageData.getTextContent()
          .then(content => {
            return content.items.map(item => item.str).join(' ');
          });
      }
    });
    
    return {
      text: data.text,
      pages: data.numpages,
      metadata: {
        info: data.info,
        version: data.version
      }
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

/**
 * Split text into chunks of approximately equal size
 * @param {string} text - Full text to split
 * @param {object} options - Chunking options
 * @returns {Array<{text: string, wordCount: number, index: number}>}
 */
const splitIntoChunks = (text, options = {}) => {
  const {
    chunkSize = CHUNK_SIZE_WORDS,
    overlap = CHUNK_OVERLAP_WORDS,
    respectParagraphs = true
  } = options;
  
  // Clean and normalize text
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into paragraphs if respecting paragraph boundaries
  let segments;
  if (respectParagraphs) {
    segments = cleanText.split(/\n\n+/);
  } else {
    segments = cleanText.split(/(?<=\.)\s+/);
  }
  
  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;
  let chunkIndex = 0;
  
  for (const segment of segments) {
    const segmentWords = segment.trim().split(/\s+/).length;
    
    if (currentWordCount + segmentWords > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.join('\n\n').trim(),
        wordCount: currentWordCount,
        index: chunkIndex++
      });
      
      // Start new chunk with overlap
      if (overlap > 0 && currentChunk.length > 0) {
        const overlapText = getOverlapText(currentChunk, overlap);
        currentChunk = [overlapText];
        currentWordCount = overlapText.split(/\s+/).length;
      } else {
        currentChunk = [];
        currentWordCount = 0;
      }
    }
    
    currentChunk.push(segment.trim());
    currentWordCount += segmentWords;
  }
  
  // Add remaining chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join('\n\n').trim(),
      wordCount: currentWordCount,
      index: chunkIndex
    });
  }
  
  return chunks;
};

/**
 * Get overlap text from the end of a chunk
 * @param {string[]} segments - Array of text segments
 * @param {number} overlapWords - Number of words for overlap
 * @returns {string}
 */
const getOverlapText = (segments, overlapWords) => {
  const fullText = segments.join(' ');
  const words = fullText.split(/\s+/);
  
  if (words.length <= overlapWords) {
    return fullText;
  }
  
  return words.slice(-overlapWords).join(' ');
};

/**
 * Detect chapter headings in text
 * @param {string} text - Full text to analyze
 * @returns {Array<{title: string, startIndex: number, endIndex: number}>}
 */
const detectChapters = (text) => {
  const chapters = [];
  
  // Common chapter heading patterns
  const patterns = [
    /^chapter\s+(\d+)[\s:.-]+(.+)$/gim,
    /^unit\s+(\d+)[\s:.-]+(.+)$/gim,
    /^lesson\s+(\d+)[\s:.-]+(.+)$/gim,
    /^(\d+)\.\s+(.+)$/gim,  // Numbered sections like "1. Introduction"
    /^part\s+(\d+)[\s:.-]+(.+)$/gim
  ];
  
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    for (const pattern of patterns) {
      const match = pattern.exec(line);
      if (match) {
        chapters.push({
          number: parseInt(match[1]),
          title: match[2]?.trim() || `Chapter ${match[1]}`,
          lineIndex: i,
          startIndex: text.indexOf(lines[i])
        });
        break;
      }
    }
  }
  
  // Calculate end indices
  for (let i = 0; i < chapters.length; i++) {
    if (i < chapters.length - 1) {
      chapters[i].endIndex = chapters[i + 1].startIndex;
    } else {
      chapters[i].endIndex = text.length;
    }
  }
  
  return chapters;
};

/**
 * Process a PDF file and create chunks in the database
 * @param {object} options - Processing options
 * @returns {Promise<{bookId: string, chunksCreated: number, chaptersCreated: number}>}
 */
const processPDF = async (options) => {
  const {
    bookId,
    filePath,
    detectChapters: shouldDetectChapters = true,
    chunkSize = CHUNK_SIZE_WORDS,
    overlap = CHUNK_OVERLAP_WORDS
  } = options;
  
  // Verify book exists
  const book = await prisma.book.findUnique({
    where: { id: bookId }
  });
  
  if (!book) {
    throw new Error('Book not found');
  }
  
  // Extract text from PDF
  const { text, pages, metadata } = await extractTextFromPDF(filePath);
  
  // Detect chapters if enabled
  let chapters = [];
  if (shouldDetectChapters) {
    chapters = detectChapters(text);
    
    // Create chapters in database
    if (chapters.length > 0) {
      await prisma.chapter.createMany({
        data: chapters.map(ch => ({
          bookId,
          number: ch.number,
          title: ch.title
        })),
        skipDuplicates: true
      });
      
      // Fetch created chapters
      const createdChapters = await prisma.chapter.findMany({
        where: { bookId },
        orderBy: { number: 'asc' }
      });
      
      chapters = chapters.map((ch, i) => ({
        ...ch,
        id: createdChapters[i]?.id
      }));
    }
  }
  
  // Split text into chunks
  const rawChunks = splitIntoChunks(text, { chunkSize, overlap });
  
  // Create chunks in database
  const chunksToCreate = rawChunks.map((chunk, index) => {
    // Find which chapter this chunk belongs to
    let chapterId = null;
    if (chapters.length > 0) {
      const chunkStart = text.indexOf(chunk.text.substring(0, 50));
      for (const chapter of chapters) {
        if (chunkStart >= chapter.startIndex && chunkStart < chapter.endIndex) {
          chapterId = chapter.id;
          break;
        }
      }
    }
    
    return {
      bookId,
      chapterId,
      text: chunk.text,
      chunkIndex: index
    };
  });
  
  // Delete existing chunks for this book
  await prisma.contentChunk.deleteMany({
    where: { bookId }
  });
  
  // Create new chunks
  await prisma.contentChunk.createMany({
    data: chunksToCreate
  });
  
  // Update book with file path
  const relativePath = path.relative(UPLOAD_DIR, filePath);
  await prisma.book.update({
    where: { id: bookId },
    data: {
      filePath: relativePath
    }
  });
  
  return {
    bookId,
    chunksCreated: chunksToCreate.length,
    chaptersCreated: chapters.length,
    totalPages: pages
  };
};

/**
 * Save uploaded PDF file
 * @param {object} file - Express multer file object
 * @param {string} bookId - Book ID
 * @returns {Promise<{filePath: string, fileName: string}>}
 */
const savePDFFile = async (file, bookId) => {
  const ext = path.extname(file.originalname);
  const fileName = `${bookId}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  
  // Ensure directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  
  // Move file to permanent location
  fs.renameSync(file.path, filePath);
  
  return {
    filePath,
    fileName
  };
};

/**
 * Get file stats
 * @param {string} filePath - Path to file
 * @returns {object} File statistics
 */
const getFileStats = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    return null;
  }
};

module.exports = {
  extractTextFromPDF,
  splitIntoChunks,
  detectChapters,
  processPDF,
  savePDFFile,
  getFileStats,
  UPLOAD_DIR
};
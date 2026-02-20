const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const schoolRoutes = require('./routes/school');
const userRoutes = require('./routes/user');
const worksheetRoutes = require('./routes/worksheet');
const skillRoutes = require('./routes/skill');
const themeRoutes = require('./routes/theme');
const boardRoutes = require('./routes/board');
const bookRoutes = require('./routes/book');
const chapterRoutes = require('./routes/chapter');
const contentRoutes = require('./routes/content');
const ingestionRoutes = require('./routes/ingestion');
const adminRoutes = require('./routes/admin');
const aiUsageRoutes = require('./routes/aiUsage');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware - CORS configuration for ngrok and local development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all ngrok URLs and local development URLs
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    // Allow any ngrok URL
    if (origin.includes('ngrok') || allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // For development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/users', userRoutes);
app.use('/api/worksheets', worksheetRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai-usage', aiUsageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
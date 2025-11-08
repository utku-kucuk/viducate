const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { DataTypes } = require('sequelize');
const logger = require('./utils/logger');

const { sequelize } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const videoRoutes = require('./routes/videos');
const progressRoutes = require('./routes/progress');
const quizRoutes = require('./routes/quizzes');
const adminRoutes = require('./routes/admin');
const notesRoutes = require('./routes/notes');
const metaRoutes = require('./routes/meta');

const app = express();
const PORT = process.env.PORT || (process.env.NODE_ENV === 'development' ? 5001 : 5000);

// When behind a proxy (e.g., CRA dev server), trust proxy so rate limiter can read client IP
app.set('trust proxy', 1);
// Remove X-Powered-By header
app.disable('x-powered-by');

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    const isProd = process.env.NODE_ENV === 'production';
    const baseAllowed = [process.env.FRONTEND_URL || 'http://localhost:3000'];
    const devExtras = ['http://localhost:3001','http://localhost:3002','http://localhost:3003','http://localhost:5001'];
    const allowedOrigins = isProd ? baseAllowed.filter(Boolean) : baseAllowed.concat(devExtras);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      if (!isProd) {
        logger.warn('CORS blocked origin:', origin);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
}));

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 5000,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/health';
  }
});

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 auth requests per windowMs
  message: 'Too many authentication requests, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Handle preflight requests
app.options('*', cors());

// Health check endpoint (no rate limiting)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Viducate API is running',
    timestamp: new Date().toISOString()
  });
});

// Placeholder image endpoint
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#999">
      ${width}x${height}
    </text>
  </svg>`;
  res.set('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Apply general rate limiting to all routes except health
app.use(generalLimiter);

// Routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/meta', metaRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    logger.error(err);
  } else {
    logger.error(err);
  }
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection and server start
async function ensureQuestionImageUrlColumn() {
  try {
    const qi = sequelize.getQueryInterface();
    const desc = await qi.describeTable('Questions');
    if (!desc || !Object.prototype.hasOwnProperty.call(desc, 'imageUrl')) {
      await qi.addColumn('Questions', 'imageUrl', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      logger.info('🛠  Added missing column Questions.imageUrl');
    } else {
      // Ensure type is TEXT to support long URLs/base64
      const col = desc.imageUrl;
      // Some dialects expose type as string; be tolerant
      const typeStr = String(col?.type || '').toLowerCase();
      if (!typeStr.includes('text')) {
        try {
          await qi.changeColumn('Questions', 'imageUrl', {
            type: DataTypes.TEXT,
            allowNull: true
          });
          logger.info('🛠  Updated Questions.imageUrl to TEXT');
        } catch (e) {
          logger.warn('⚠️  Could not alter Questions.imageUrl to TEXT (dialect limitation?):', e?.message || e);
        }
      }
    }
  } catch (error) {
    logger.warn('⚠️  Could not ensure Questions.imageUrl column:', error?.message || error);
  }
}

async function ensureCourseNewColumns() {
  try {
    const qi = sequelize.getQueryInterface();
    const desc = await qi.describeTable('Courses');
    if (!desc) return;
    if (!Object.prototype.hasOwnProperty.call(desc, 'department')) {
      await qi.addColumn('Courses', 'department', {
        type: DataTypes.STRING,
        allowNull: true
      });
      logger.info('🛠  Added missing column Courses.department');
    }
    if (!Object.prototype.hasOwnProperty.call(desc, 'adminDisabled')) {
      await qi.addColumn('Courses', 'adminDisabled', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
      logger.info('🛠  Added missing column Courses.adminDisabled');
    }
    if (!Object.prototype.hasOwnProperty.call(desc, 'adminPublishLocked')) {
      await qi.addColumn('Courses', 'adminPublishLocked', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
      logger.info('🛠  Added missing column Courses.adminPublishLocked');
    }
    if (!Object.prototype.hasOwnProperty.call(desc, 'teacherPublishAllowed')) {
      await qi.addColumn('Courses', 'teacherPublishAllowed', {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      });
      logger.info('🛠  Added missing column Courses.teacherPublishAllowed');
    }
    // Relax category to allowNull if currently not null
    if (desc.category && desc.category.allowNull === false) {
      try {
        await qi.changeColumn('Courses', 'category', {
          type: DataTypes.STRING,
          allowNull: true
        });
        logger.info('🛠  Updated Courses.category to allow NULL');
      } catch (e) {
        logger.warn('⚠️  Could not alter Courses.category allowNull (may not be supported on current dialect):', e?.message || e);
      }
    }
  } catch (error) {
    logger.warn('⚠️  Could not ensure Courses new columns:', error?.message || error);
  }
}

// Ensure new columns on Videos table for backward compatibility
async function ensureVideoNewColumns() {
  try {
    const qi = sequelize.getQueryInterface();
    const desc = await qi.describeTable('Videos');
    if (!desc) return;
    if (!Object.prototype.hasOwnProperty.call(desc, 'videoVariants')) {
      await qi.addColumn('Videos', 'videoVariants', {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]'
      });
      logger.info('🛠  Added missing column Videos.videoVariants');
    }
  } catch (error) {
    logger.warn('⚠️  Could not ensure Videos new columns:', error?.message || error);
  }
}

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully.');
    
    // Sync database (avoid alter for SQLite to prevent FK/unique issues)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync();
      logger.info('✅ Database synchronized (no alter).');
    }
    
    // Ensure new columns that may not exist on older DBs
    await ensureQuestionImageUrlColumn();
    await ensureCourseNewColumns();
    await ensureVideoNewColumns();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Viducate server running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

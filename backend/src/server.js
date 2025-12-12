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
const fileRoutes = require('./routes/files');

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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Build allowed origins list
    const baseAllowed = [frontendUrl];
    
    // Add http/https variations if frontend URL is https
    if (frontendUrl.startsWith('https://')) {
      baseAllowed.push(frontendUrl.replace('https://', 'http://'));
    } else if (frontendUrl.startsWith('http://')) {
      baseAllowed.push(frontendUrl.replace('http://', 'https://'));
    }
    
    // Add domain without protocol for flexibility
    try {
      const url = new URL(frontendUrl);
      baseAllowed.push(`https://${url.hostname}`);
      baseAllowed.push(`http://${url.hostname}`);
    } catch (e) {
      // Invalid URL, skip
    }
    
    const devExtras = ['http://localhost:3001','http://localhost:3002','http://localhost:3003','http://localhost:5001'];
    const allowedOrigins = isProd ? baseAllowed.filter(Boolean) : baseAllowed.concat(devExtras);
    
    // Normalize origins for comparison (remove trailing slash and protocol)
    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
    const normalizedAllowed = allowedOrigins.map(o => o.replace(/\/$/, '').toLowerCase());
    
    // Also check if origin hostname matches allowed hostname
    let originMatches = false;
    try {
      const originUrl = new URL(origin);
      for (const allowed of allowedOrigins) {
        try {
          const allowedUrl = new URL(allowed);
          if (originUrl.hostname === allowedUrl.hostname) {
            originMatches = true;
            break;
          }
        } catch (e) {
          // Skip invalid URL
        }
      }
    } catch (e) {
      // Origin URL parsing failed
    }
    
    if (normalizedAllowed.indexOf(normalizedOrigin) !== -1 || originMatches) {
      if (isProd) {
        logger.info('✅ CORS allowed origin:', origin);
      }
      callback(null, true);
    } else {
      // Always log CORS blocks in production for debugging
      logger.warn('❌ CORS blocked origin:', origin);
      logger.warn('✅ CORS allowed origins:', JSON.stringify(allowedOrigins, null, 2));
      logger.warn('📝 CORS frontend URL from env:', frontendUrl);
      logger.warn('🔍 Normalized origin:', normalizedOrigin);
      logger.warn('🔍 Normalized allowed:', JSON.stringify(normalizedAllowed, null, 2));
      logger.warn('🔍 Origin matches by hostname:', originMatches);
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

// More lenient rate limiting for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 2000 : 10000, // Higher limit for admin operations
  message: 'Too many admin requests, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/health';
  }
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
// Allow embedding uploaded files in iframes from frontend dev origin (to preview PDFs/PPTX)
// CRITICAL: Enable range requests for video streaming to prevent freezing
app.use('/uploads', (req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    // Remove restrictive frame headers and allow frontend dev to embed
    res.removeHeader('X-Frame-Options');
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000"
    );
  }
  
  // Enable range requests for video files (critical for streaming)
  // This allows browsers to request specific byte ranges, preventing freezing
  if (req.path.match(/\.(mp4|webm|avi|mov|wmv|flv|mkv)$/i)) {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  
  next();
}, express.static('uploads', {
  // Enable range requests for video streaming
  setHeaders: (res, path) => {
    if (path.match(/\.(mp4|webm|avi|mov|wmv|flv|mkv)$/i)) {
      res.setHeader('Accept-Ranges', 'bytes');
      // Set appropriate Content-Type based on file extension
      const ext = path.toLowerCase().split('.').pop();
      const mimeTypes = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'mkv': 'video/x-matroska'
      };
      if (mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
      }
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Handle preflight requests
app.options('*', cors());

// Health check endpoint (no rate limiting)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Viducate API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '5000',
    frontendUrl: process.env.FRONTEND_URL || 'not set'
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

// Apply general rate limiting to all routes except health and admin
app.use((req, res, next) => {
  // Skip rate limiting for admin routes (they have their own limiter)
  if (req.path.startsWith('/api/admin')) {
    return next();
  }
  return generalLimiter(req, res, next);
});

// Routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/files', fileRoutes);

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
async function getTableName(expectedName) {
  try {
    const qi = sequelize.getQueryInterface();
    const dialect = sequelize.getDialect();
    
    // For SQLite, query the sqlite_master table to find actual table names
    if (dialect === 'sqlite') {
      try {
        // First try exact match
        const desc = await qi.describeTable(expectedName);
        if (desc) return expectedName;
      } catch (e) {
        // Not found, continue
      }
      
      // Query sqlite_master for all tables
      const [results] = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      
      if (results && results.length > 0) {
        // Try to find exact case-insensitive match first
        const exactMatch = results.find(r => 
          r.name.toLowerCase() === expectedName.toLowerCase()
        );
        if (exactMatch) {
          logger.info(`✅ Found table: ${exactMatch.name} (looking for ${expectedName})`);
          return exactMatch.name;
        }
        
        // Try partial match (e.g., "Questions" matches "Questions" or "questions")
        const partial = results.find(r => 
          r.name.toLowerCase().includes(expectedName.toLowerCase()) ||
          expectedName.toLowerCase().includes(r.name.toLowerCase())
        );
        if (partial) {
          logger.info(`✅ Found table (partial): ${partial.name} (looking for ${expectedName})`);
          return partial.name;
        }
        
        // Log available tables for debugging
        logger.warn(`⚠️  Table ${expectedName} not found. Available tables: ${results.map(r => r.name).join(', ')}`);
      }
      
      // Try common variations
      const variations = [
        expectedName,
        expectedName.toLowerCase(),
        expectedName.toUpperCase(),
        expectedName.charAt(0).toUpperCase() + expectedName.slice(1).toLowerCase()
      ];
      
      for (const name of variations) {
        try {
          const desc = await qi.describeTable(name);
          if (desc) return name;
        } catch (e) {
          // Continue
        }
      }
    } else {
      // For other databases, try variations
      const variations = [expectedName, expectedName.toLowerCase(), expectedName.toUpperCase()];
      for (const name of variations) {
        try {
          const desc = await qi.describeTable(name);
          if (desc) return name;
        } catch (e) {
          // Continue
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.warn(`⚠️  Error finding table name for ${expectedName}:`, error?.message || error);
    return null;
  }
}

async function ensureQuestionImageUrlColumn() {
  try {
    const qi = sequelize.getQueryInterface();
    // SQLite uses exact table names from database
    const tableName = await getTableName('Questions');
    if (!tableName) {
      logger.warn('⚠️  Questions table not found, skipping column check');
      return;
    }
    const desc = await qi.describeTable(tableName);
    if (!desc || !Object.prototype.hasOwnProperty.call(desc, 'imageUrl')) {
      await qi.addColumn(tableName, 'imageUrl', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      logger.info(`🛠  Added missing column ${tableName}.imageUrl`);
    } else {
      // Ensure type is TEXT to support long URLs/base64
      const col = desc.imageUrl;
      // Some dialects expose type as string; be tolerant
      const typeStr = String(col?.type || '').toLowerCase();
      if (!typeStr.includes('text')) {
        try {
          await qi.changeColumn(tableName, 'imageUrl', {
            type: DataTypes.TEXT,
            allowNull: true
          });
          logger.info(`🛠  Updated ${tableName}.imageUrl to TEXT`);
        } catch (e) {
          logger.warn(`⚠️  Could not alter ${tableName}.imageUrl to TEXT (dialect limitation?):`, e?.message || e);
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
    const tableName = await getTableName('Courses');
    if (!tableName) {
      logger.warn('⚠️  Courses table not found, skipping column check');
      return;
    }
    const desc = await qi.describeTable(tableName);
    if (!desc) return;
    if (!Object.prototype.hasOwnProperty.call(desc, 'department')) {
      await qi.addColumn(tableName, 'department', {
        type: DataTypes.STRING,
        allowNull: true
      });
      logger.info(`🛠  Added missing column ${tableName}.department`);
    }
    if (!Object.prototype.hasOwnProperty.call(desc, 'adminDisabled')) {
      await qi.addColumn(tableName, 'adminDisabled', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
      logger.info(`🛠  Added missing column ${tableName}.adminDisabled`);
    }
    if (!Object.prototype.hasOwnProperty.call(desc, 'adminPublishLocked')) {
      await qi.addColumn(tableName, 'adminPublishLocked', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
      logger.info(`🛠  Added missing column ${tableName}.adminPublishLocked`);
    }
    if (!Object.prototype.hasOwnProperty.call(desc, 'teacherPublishAllowed')) {
      await qi.addColumn(tableName, 'teacherPublishAllowed', {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      });
      logger.info(`🛠  Added missing column ${tableName}.teacherPublishAllowed`);
    }
    // Relax category to allowNull if currently not null
    if (desc.category && desc.category.allowNull === false) {
      try {
        await qi.changeColumn(tableName, 'category', {
          type: DataTypes.STRING,
          allowNull: true
        });
        logger.info(`🛠  Updated ${tableName}.category to allow NULL`);
      } catch (e) {
        logger.warn(`⚠️  Could not alter ${tableName}.category allowNull (may not be supported on current dialect):`, e?.message || e);
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
    const tableName = await getTableName('Videos');
    if (!tableName) {
      logger.warn('⚠️  Videos table not found, skipping column check');
      return;
    }
    const desc = await qi.describeTable(tableName);
    if (!desc) return;
    if (!Object.prototype.hasOwnProperty.call(desc, 'videoVariants')) {
      await qi.addColumn(tableName, 'videoVariants', {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]'
      });
      logger.info(`🛠  Added missing column ${tableName}.videoVariants`);
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

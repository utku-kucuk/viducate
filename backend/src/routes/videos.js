const express = require('express');
const router = express.Router();
const { auth, requireTeacher } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Video, User, Progress, Course } = require('../models');
const videoController = require('../controllers/videoController');
const { processVideoResolutions } = require('..//utils/videoProcessor');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Memory storage for chunk uploads
const chunkMemoryStorage = multer.memoryStorage();
const getChunkMaxSize = () => {
  const size = process.env.MAX_CHUNK_SIZE || '10MB'; // Default to 10MB per chunk
  if (typeof size === 'number') return size;
  const str = size.toString().toUpperCase();
  if (str.endsWith('GB')) return parseFloat(str) * 1024 * 1024 * 1024;
  if (str.endsWith('MB')) return parseFloat(str) * 1024 * 1024;
  if (str.endsWith('KB')) return parseFloat(str) * 1024;
  return 10 * 1024 * 1024; // Fallback to 10MB
};

const chunkUpload = multer({
  storage: chunkMemoryStorage,
  limits: {
    fileSize: getChunkMaxSize()
  }
}).single('chunk');

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/videos');
    // Create directory if it doesn't exist
    ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const getMaxSize = () => {
  const size = process.env.MAX_FILE_SIZE || '500MB';
  if (typeof size === 'number') return size;
  const str = size.toString().toUpperCase();
  if (str.endsWith('GB')) return parseFloat(str) * 1024 * 1024 * 1024;
  if (str.endsWith('MB')) return parseFloat(str) * 1024 * 1024;
  return 500 * 1024 * 1024;
};

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check file type - be more lenient for testing
    if (file.mimetype.startsWith('video/') || file.originalname.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  },
  limits: {
    fileSize: getMaxSize()
  }
});

// Video upload endpoint (fast response): save original immediately, process variants in background
router.post('/upload', auth, requireTeacher, (req, res, next) => {
  console.log('📤 Video upload endpoint called');
  console.log('Request headers:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length']
  });
  console.log('Request body keys:', Object.keys(req.body || {}));
  next();
}, (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      console.error('Multer error code:', err.code);
      console.error('Multer error field:', err.field);
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
          error: process.env.NODE_ENV === 'development' ? err.code : undefined
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Upload failed',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('📥 Multer processing completed');
    console.log('File received:', req.file ? {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    } : 'No file');
    
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    const { title, description, duration, order, isPublished, courseId } = req.body;
    
    console.log('Video upload request:', {
      title,
      courseId,
      fileSize: req.file?.size,
      filename: req.file?.filename
    });
    
    // Validate courseId if provided
    if (courseId) {
      try {
        const course = await Course.findByPk(courseId);
        if (!course) {
          return res.status(400).json({
            success: false,
            message: 'Course not found'
          });
        }
        // Check if user owns the course
        if (course.teacherId !== req.user.id && req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to add videos to this course'
          });
        }
      } catch (e) {
        console.error('Error validating course:', e);
        return res.status(500).json({
          success: false,
          message: 'Error validating course'
        });
      }
    }
    
    let resolvedIsPublished = undefined;
    if (typeof isPublished !== 'undefined') {
      resolvedIsPublished = (typeof isPublished === 'string') ? (isPublished === 'true') : Boolean(isPublished);
    } else if (courseId) {
      try {
        const parentCourse = await Course.findByPk(courseId);
        if (parentCourse) {
          resolvedIsPublished = Boolean(parentCourse.isPublished);
        }
      } catch (e) {
        resolvedIsPublished = undefined;
      }
    }

    // Paths for processing (but we will process asynchronously)
    const inputFilePath = path.join(__dirname, '../../uploads/videos', req.file.filename);
    const outputDir = path.join(__dirname, '../../uploads/videos');
    const baseFilename = path.parse(req.file.filename).name;

    // Create immediately with original only; mark processing
    const originalVariant = [{
      quality: '720p',
      url: `/uploads/videos/${req.file.filename}`,
      fileSize: req.file.size
    }];

    const video = await Video.create({
      title: title || req.file.originalname,
      description: description || '',
      duration: parseInt(duration) || 1,
      order: parseInt(order) || 0,
      fileUrl: originalVariant[0].url,
      fileSize: req.file.size,
      teacherId: req.user.id,
      courseId: courseId || null,
      isPublished: typeof resolvedIsPublished === 'boolean' ? resolvedIsPublished : false,
      quality: originalVariant[0].quality,
      videoVariants: originalVariant,
      processingStatus: 'processing'
    });
    
    console.log('Video created successfully:', {
      id: video.id,
      title: video.title,
      courseId: video.courseId
    });

    const videoResponse = video.toJSON();

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully. Processing additional resolutions in background.',
      data: videoResponse
    });

    // Kick off background processing; do not await
    (async () => {
      try {
        logger.info('Starting background video processing for multiple resolutions...');
        const variants = await processVideoResolutions(inputFilePath, outputDir, baseFilename);
        // Ensure at least original exists
        const finalVariants = Array.isArray(variants) && variants.length > 0 ? variants : originalVariant;
        // Update DB with generated variants
        await video.update({
          videoVariants: finalVariants,
          quality: finalVariants[finalVariants.length - 1]?.quality || video.quality,
          fileUrl: finalVariants[finalVariants.length - 1]?.url || video.fileUrl,
          processingStatus: 'completed'
        });
        logger.info(`Background processing completed. Variants: ${finalVariants.length}`);
      } catch (e) {
        logger.error('Background processing failed:', e);
        try {
          await video.update({ processingStatus: 'failed' });
        } catch { }
      }
    })();

  } catch (error) {
    console.error('❌ Error uploading video:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body keys:', Object.keys(req.body || {}));
    console.error('Request body:', req.body);
    console.error('File info:', req.file ? {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    } : 'No file');
    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Initiate chunked upload: create temporary Video row and return uploadId
router.post('/initiate-upload', auth, requireTeacher, async (req, res) => {
  try {
    const { title, description, filename } = req.body;

    const video = await Video.create({
      title: title && title.trim() ? title : (filename ? filename.replace(/\.[^/.]+$/, '') : 'Untitled Video'),
      description: description || '',
      duration: 1,
      order: 0,
      fileUrl: null,
      fileSize: null,
      teacherId: req.user.id,
      courseId: null,
      isPublished: false,
      quality: '720p',
      videoVariants: [],
      processingStatus: 'processing' // treat as uploading/processing
    });

    const uploadId = video.id; // use video id as external/upload id
    const chunkDir = path.join(__dirname, '../../uploads/chunks', uploadId);
    ensureDirSync(chunkDir);

    return res.status(201).json({
      success: true,
      data: {
        uploadId,
        videoId: video.id
      }
    });
  } catch (error) {
    logger.error('Error initiating upload:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate upload' });
  }
});

// Receive a chunk
router.post('/upload-chunk', auth, requireTeacher, (req, res) => {
  chunkUpload(req, res, async (err) => {
    if (err) {
      logger.warn('Chunk upload error:', err);
      return res.status(400).json({ success: false, message: err.message || 'Invalid chunk' });
    }
    try {
      const { uploadId, chunkNumber } = req.body;
      if (!uploadId || !chunkNumber) {
        return res.status(400).json({ success: false, message: 'uploadId and chunkNumber are required' });
      }
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Chunk file is missing' });
      }

      const chunkDir = path.join(__dirname, '../../uploads/chunks', uploadId);
      ensureDirSync(chunkDir);
      const chunkPath = path.join(chunkDir, `chunk_${String(chunkNumber).padStart(6, '0')}`);
      fs.writeFileSync(chunkPath, req.file.buffer);

      return res.json({ success: true });
    } catch (e) {
      logger.error('Failed to save chunk:', e);
      return res.status(500).json({ success: false, message: 'Failed to save chunk' });
    }
  });
});

// Complete upload: merge chunks and kick off processing
router.post('/complete-upload', auth, requireTeacher, async (req, res) => {
  try {
    const { uploadId, filename, totalChunks } = req.body;
    if (!uploadId || !filename || !totalChunks) {
      return res.status(400).json({ success: false, message: 'uploadId, filename, and totalChunks are required' });
    }

    const video = await Video.findByPk(uploadId);
    if (!video || video.teacherId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const chunkDir = path.join(__dirname, '../../uploads/chunks', uploadId);
    const files = fs.readdirSync(chunkDir)
      .filter(f => f.startsWith('chunk_'))
      .sort();

    if (files.length !== Number(totalChunks)) {
      return res.status(400).json({ success: false, message: 'Missing chunks' });
    }

    ensureDirSync(path.join(__dirname, '../../uploads/videos'));
    const ext = path.extname(filename) || '.mp4';
    const finalName = `video-${uploadId}${ext}`;
    const finalPath = path.join(__dirname, '../../uploads/videos', finalName);

    // merge
    const writeStream = fs.createWriteStream(finalPath);
    for (const f of files) {
      const chunkPath = path.join(chunkDir, f);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
    }
    writeStream.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // cleanup chunks
    try {
      for (const f of files) {
        fs.unlinkSync(path.join(chunkDir, f));
      }
      fs.rmdirSync(chunkDir);
    } catch (cleanupErr) {
      logger.warn('Chunk cleanup warning:', cleanupErr.message);
    }

    const stat = fs.statSync(finalPath);
    const originalVariant = [{ quality: '720p', url: `/uploads/videos/${finalName}`, fileSize: stat.size }];

    await video.update({
      fileUrl: originalVariant[0].url,
      fileSize: stat.size,
      processingStatus: 'processing',
      videoVariants: originalVariant,
      quality: '720p'
    });

    // Respond immediately; background process resolutions
    res.json({ success: true, data: { videoId: video.id, fileUrl: video.fileUrl } });

    // background processing and publish check
    (async () => {
      try {
        const inputFilePath = finalPath;
        const outputDir = path.join(__dirname, '../../uploads/videos');
        const baseFilename = path.parse(finalName).name;
        const variants = await processVideoResolutions(inputFilePath, outputDir, baseFilename);
        const finalVariants = Array.isArray(variants) && variants.length > 0 ? variants : originalVariant;
        await video.update({
          videoVariants: finalVariants,
          quality: finalVariants[finalVariants.length - 1]?.quality || video.quality,
          fileUrl: finalVariants[finalVariants.length - 1]?.url || video.fileUrl,
          processingStatus: 'completed'
        });

        // Do not auto-publish course here; publishing is an explicit teacher/admin action
      } catch (e) {
        logger.error('Background finalize failed:', e);
        try { await video.update({ processingStatus: 'failed' }); } catch { }
      }
    })();
  } catch (error) {
    logger.error('Error completing upload:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete upload' });
  }
});

// Mark upload failed
router.post('/fail-upload', auth, requireTeacher, async (req, res) => {
  try {
    const { uploadId } = req.body;
    const video = await Video.findByPk(uploadId);
    if (!video || video.teacherId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    await video.update({ processingStatus: 'failed' });
    return res.json({ success: true });
  } catch (e) {
    logger.error('fail-upload error:', e);
    return res.status(500).json({ success: false });
  }
});

// Get all videos
router.get('/', auth, async (req, res) => {
  try {
    const videos = await Video.findAll({
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    logger.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos'
    });
  }
});

// Get videos by course ID
router.get('/course/:courseId', auth, videoController.getVideosByCourse);

// Get video by ID - use controller for consistency
router.get('/:id', auth, videoController.getVideoById);

// Update video
router.put('/:id', auth, requireTeacher, [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('duration').optional().isInt({ min: 0 }),
  body('order').optional().isInt({ min: 0 })
], validate, async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if user owns this video
    if (video.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own videos'
      });
    }

    await video.update(req.body);

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: video
    });
  } catch (error) {
    logger.error('Error updating video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video'
    });
  }
});

// Delete video
router.delete('/:id', auth, requireTeacher, async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if user owns this video
    if (video.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own videos'
      });
    }

    await video.destroy();

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video'
    });
  }
});

// Get progress for all videos in a course
router.get('/course/:courseId/progress', auth, videoController.getStudentProgress);

module.exports = router;

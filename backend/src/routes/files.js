const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, requireTeacher } = require('../middleware/auth');
const { Video, Course } = require('../models');
const logger = require('../utils/logger');

// Ensure directory exists
function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Multer storage for course files (PDF/PPT)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, '../../uploads/files');
    ensureDirSync(dest);
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const allowedMimeTypes = new Set([
  'application/pdf'
]);

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (allowedMimeTypes.has(file.mimetype) || /\.pdf$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Upload a course file and create a Video row representing this file
router.post('/upload', auth, requireTeacher, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { title, description, courseId, order } = req.body;

    // Optionally link to course and inherit publish status
    let isPublished = false;
    if (courseId) {
      const course = await Course.findByPk(courseId);
      if (course) {
        isPublished = Boolean(course.isPublished);
      }
    }

    const url = `/uploads/files/${req.file.filename}`;
    const video = await Video.create({
      title: (title && String(title).trim()) || req.file.originalname.replace(/\.[^/.]+$/, ''),
      description: description || '',
      fileUrl: url,
      // Keep variants empty; treat as non-video resource
      videoVariants: [],
      duration: 1, // minimal duration to satisfy progress model
      order: parseInt(order) || 0,
      isFree: true,
      courseId: courseId || null,
      teacherId: req.user.id,
      isPublished,
      processingStatus: 'completed',
      // keep legacy fields compatible
      quality: '720p'
    });

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: video
    });
  } catch (error) {
    logger.error('Error uploading file:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
});

module.exports = router;



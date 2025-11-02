const express = require('express');
const router = express.Router();
const { auth, requireTeacher } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');
const { Video, User, Progress, Course } = require('../models');
const videoController = require('../controllers/videoController');

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/videos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Video upload endpoint
router.post('/upload', auth, requireTeacher, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    const { title, description, duration, order, isPublished } = req.body;
    let resolvedIsPublished = undefined;
    if (typeof isPublished !== 'undefined') {
      resolvedIsPublished = (typeof isPublished === 'string') ? (isPublished === 'true') : Boolean(isPublished);
    } else if (req.body.courseId) {
      try {
        const parentCourse = await Course.findByPk(req.body.courseId);
        if (parentCourse) {
          resolvedIsPublished = Boolean(parentCourse.isPublished);
        }
      } catch (e) {
        resolvedIsPublished = undefined;
      }
    }
    
    // Create video record in database
    const video = await Video.create({
      title: title || req.file.originalname,
      description: description || '',
      duration: parseInt(duration) || 1,
      order: parseInt(order) || 0,
      fileUrl: `/uploads/videos/${req.file.filename}`,
      fileSize: req.file.size,
      teacherId: req.user.id,
      courseId: req.body.courseId || null,
      isPublished: typeof resolvedIsPublished === 'boolean' ? resolvedIsPublished : false
    });

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: video
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: error.message
    });
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
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos'
    });
  }
});

// Get video by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video'
    });
  }
});

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
    console.error('Error updating video:', error);
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
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video'
    });
  }
});

// Get progress for all videos in a course
router.get('/course/:courseId/progress', auth, videoController.getStudentProgress);

module.exports = router;

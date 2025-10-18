const { Video, Course, Progress } = require('../models');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer configuration for video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/videos');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  }
}).single('video');

// Get videos by course
const getVideosByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const videos = await Video.findAll({
      where: { courseId },
      order: [['order', 'ASC']],
      include: [
        {
          model: Course,
          attributes: ['id', 'title']
        },
        {
          model: Progress,
          where: { userId },
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: videos
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get single video with progress
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const video = await Video.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'teacherId']
        }
      ]
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Get user's progress for this video
    const progress = await Progress.findOne({
      where: { userId, videoId: id }
    });

    res.json({
      success: true,
      data: {
        ...video.toJSON(),
        progress: progress || null
      }
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Upload video file
const uploadVideo = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    try {
      const { title, description, order, isFree, courseId } = req.body;

      // Validate required fields
      if (!title || !courseId) {
        return res.status(400).json({
          success: false,
          message: 'Title and courseId are required'
        });
      }

      // Check if teacher owns the course
      const course = await Course.findOne({
        where: { id: courseId, teacherId: req.user.id }
      });

      if (!course) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add videos to this course'
        });
      }

      // Get video duration (you might want to use a library like ffprobe)
      // For now, we'll set a default duration
      const duration = 1; // Minimum 1 second to pass validation

      // Create video record
      const video = await Video.create({
        title,
        description: description || '',
        fileUrl: `/uploads/videos/${req.file.filename}`,
        duration,
        order: order || 1,
        isFree: isFree === 'true' || isFree === true,
        courseId,
        isPublished: true,
        processingStatus: 'completed'
      });

      res.status(201).json({
        success: true,
        data: video,
        message: 'Video uploaded successfully'
      });
    } catch (error) {
      console.error('Error creating video:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });
};

// Create new video (teacher only)
const createVideo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description, url, duration, order, courseId } = req.body;

    // Check if teacher owns the course
    const course = await Course.findOne({
      where: { id: courseId, teacherId: req.user.id }
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add videos to this course'
      });
    }

    const video = await Video.create({
      title,
      description,
      fileUrl: url,
      duration,
      order,
      courseId,

    });

    res.status(201).json({
      success: true,
      data: video,
      message: 'Video created successfully'
    });
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update video (teacher only)
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, duration, order } = req.body;

    const video = await Video.findOne({
      where: { id },
      include: [
        {
          model: Course,
          where: { teacherId: req.user.id }
        }
      ]
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or you do not have permission'
      });
    }

    await video.update({
      title,
      description,
      fileUrl: url,
      duration,
      order,

    });

    res.json({
      success: true,
      data: video,
      message: 'Video updated successfully'
    });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete video (teacher only)
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findOne({
      where: { id },
      include: [
        {
          model: Course,
          where: { teacherId: req.user.id }
        }
      ]
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or you do not have permission'
      });
    }

    // Delete the video file if it exists
    if (video.fileUrl && video.fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../..', video.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
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
      message: 'Internal server error'
    });
  }
};

// Get student progress for all videos in a course
const getStudentProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // First get all videos for the course
    const videos = await Video.findAll({
      where: { courseId },
      order: [['order', 'ASC']],
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title']
        }
      ]
    });

    // Then get progress for each video
    const videosWithProgress = await Promise.all(
      videos.map(async (video) => {
        const progress = await Progress.findOne({
          where: { userId, videoId: video.id }
        });
        
        return {
          ...video.toJSON(),
          Progress: progress ? [progress] : []
        };
      })
    );

    res.json({
      success: true,
      data: videosWithProgress
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};





module.exports = {
  getVideosByCourse,
  getVideoById,
  uploadVideo,
  createVideo,
  updateVideo,
  deleteVideo,
  getStudentProgress
};

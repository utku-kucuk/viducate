const { Video, Course, Progress, UserCourse } = require('../models');
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
    const { quality } = req.query; // Optional quality parameter for all videos

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

    // Determine access
    const course = await Course.findByPk(courseId);
    const isTeacher = course && course.teacherId === userId;
    const isAdmin = req.user && req.user.role === 'admin';
    const enrollment = await UserCourse.findOne({ where: { userId, courseId } });
    const isEnrolled = !!enrollment;

    // Enhance videos with resolution data
    let videosWithResolutions = videos.map(video => {
      try {
        const videoData = video.toJSON();
        videoData.availableQualities = video.getAvailableQualities();
        videoData.selectedUrl = video.getVideoUrl(quality || null) || videoData.fileUrl;
        videoData.currentQuality = quality || (videoData.availableQualities.length > 0 
          ? videoData.availableQualities[videoData.availableQualities.length - 1] 
          : videoData.quality || null);
        // Ensure fileUrl is always present for backward compatibility
        if (!videoData.selectedUrl && videoData.fileUrl) {
          videoData.selectedUrl = videoData.fileUrl;
        }
        return videoData;
      } catch (error) {
        console.error('Error processing video:', error);
        // Fallback to basic video data
        const videoData = video.toJSON();
        videoData.availableQualities = videoData.quality ? [videoData.quality] : [];
        videoData.selectedUrl = videoData.fileUrl;
        videoData.currentQuality = videoData.quality || null;
        return videoData;
      }
    });

    // If user is not teacher/admin and not enrolled, hide unpublished videos
    if (!isTeacher && !isAdmin && !isEnrolled) {
      videosWithResolutions = videosWithResolutions.filter(v => Boolean(v.isPublished));
    }

    res.json({
      success: true,
      data: videosWithResolutions
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
    const { quality } = req.query; // Optional quality parameter

    const video = await Video.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'teacherId', 'isPublished']
        }
      ]
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Access control: Block access to unpublished video/course unless teacher/admin/enrolled
    try {
      const isTeacher = (video.teacherId === userId) || (video.course && video.course.teacherId === userId);
      const isAdmin = req.user && req.user.role === 'admin';
      const videoPublished = Boolean(video.isPublished);
      const coursePublished = video.course ? Boolean(video.course.isPublished) : true;
      let isEnrolled = false;
      if (video.courseId) {
        const enrollment = await UserCourse.findOne({ where: { userId, courseId: video.courseId } });
        isEnrolled = !!enrollment;
      }

      if ((!videoPublished || !coursePublished) && !(isTeacher || isAdmin || isEnrolled)) {
        return res.status(404).json({ success: false, message: 'Video not found' });
      }
    } catch (e) {
      console.error('Access control check failed:', e);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    // Get user's progress for this video
    const progress = await Progress.findOne({
      where: { userId, videoId: id }
    });

    // Prepare video data with resolution support
    const videoData = video.toJSON();
    
    try {
      // Ensure videoVariants is properly parsed and included
      // First try to get from model instance (uses getter)
      let variants = [];
      try {
        variants = video.videoVariants || [];
        if (!Array.isArray(variants)) {
          // If it's a string (raw DB value), try to parse
          if (typeof variants === 'string') {
            variants = JSON.parse(variants);
          } else {
            variants = [];
          }
        }
      } catch (e) {
        console.warn('Error getting videoVariants from model:', e.message);
        variants = [];
      }
      
      // If still empty, try from videoData
      if (variants.length === 0 && videoData.videoVariants) {
        if (Array.isArray(videoData.videoVariants)) {
          variants = videoData.videoVariants;
        } else if (typeof videoData.videoVariants === 'string') {
          try {
            variants = JSON.parse(videoData.videoVariants);
          } catch (e) {
            variants = [];
          }
        }
      }
      
      videoData.videoVariants = variants;
      console.log('Processed videoVariants:', variants.length, 'variants');
      
      // Add availableQualities and selectedUrl
      videoData.availableQualities = video.getAvailableQualities();
      console.log('Available qualities from model:', videoData.availableQualities);
      
      // If no qualities from model, extract from variants
      if (videoData.availableQualities.length === 0 && variants.length > 0) {
        videoData.availableQualities = variants.map(v => v.quality || v).filter(Boolean);
        console.log('Extracted qualities from variants:', videoData.availableQualities);
      }
      
      // If quality specified, use it; otherwise use default
      videoData.selectedUrl = video.getVideoUrl(quality || null) || videoData.fileUrl;
      videoData.currentQuality = quality || (videoData.availableQualities.length > 0 
        ? videoData.availableQualities[videoData.availableQualities.length - 1] 
        : videoData.quality || null);
      
      // Ensure fileUrl is always present for backward compatibility
      if (!videoData.selectedUrl && videoData.fileUrl) {
        videoData.selectedUrl = videoData.fileUrl;
      }
      
      console.log('Final video data:', {
        availableQualities: videoData.availableQualities.length,
        videoVariants: videoData.videoVariants.length,
        currentQuality: videoData.currentQuality
      });
    } catch (error) {
      console.error('Error processing video resolution data:', error);
      // Fallback to basic video data
      videoData.videoVariants = videoData.videoVariants || [];
      videoData.availableQualities = videoData.quality ? [videoData.quality] : [];
      videoData.selectedUrl = videoData.fileUrl;
      videoData.currentQuality = videoData.quality || null;
    }

    res.json({
      success: true,
      data: {
        ...videoData,
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

      // Create video record with initial variant (single upload creates one variant)
      // videoVariants can be added later when multiple resolutions are processed
      const fileUrl = `/uploads/videos/${req.file.filename}`;
      
      // Prepare video data
      const videoData = {
        title,
        description: description || '',
        fileUrl, // Keep for backward compatibility
        videoVariants: [{
          quality: '720p', // Default quality for uploaded video
          url: fileUrl,
          fileSize: req.file.size
        }],
        duration,
        order: order || 1,
        isFree: isFree === 'true' || isFree === true,
        courseId,
        isPublished: true,
        processingStatus: 'completed',
        quality: '720p' // Legacy field
      };
      
      const video = await Video.create(videoData);

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

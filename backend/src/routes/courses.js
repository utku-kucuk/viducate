const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth, requireTeacher } = require('../middleware/auth');
const {
  getAllCourses,
  getTeacherCourses,
  getTeacherStudents,
  getEnrolledCourses,
  enrollInCourse,
  unenrollFromCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseById
} = require('../controllers/courseController');
const { body } = require('express-validator');

// Validation rules
const courseValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),
  body('category').optional().trim(),
  body('department').optional().trim(),
  body('level').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Level must be beginner, intermediate, or advanced')
];

// Update validation allows partial updates
const courseUpdateValidation = [
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),
  body('category').optional().trim(),
  body('department').optional().trim(),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Level must be beginner, intermediate, or advanced'),
  body('chapters').optional()
];

// Public routes (for students)
router.get('/', auth, getAllCourses);
router.get('/enrolled', auth, getEnrolledCourses);
router.get('/:id', auth, getCourseById);

// Enrollment routes
router.post('/:courseId/enroll', auth, enrollInCourse);
router.delete('/:courseId/enroll', auth, unenrollFromCourse);

// Teacher routes
router.get('/teacher/my-courses', auth, requireTeacher, getTeacherCourses);
router.get('/teacher/students', auth, requireTeacher, getTeacherStudents);
// Configure multer for thumbnail uploads
const thumbnailStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/thumbnails/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'thumbnail-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadThumbnail = multer({ 
  storage: thumbnailStorage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Thumbnail upload endpoint
router.post('/upload-thumbnail', auth, requireTeacher, uploadThumbnail.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No thumbnail file uploaded'
      });
    }

    const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        url: thumbnailUrl,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload thumbnail'
    });
  }
});

router.post('/', auth, requireTeacher, courseValidation, createCourse);
router.put('/:id', auth, requireTeacher, courseUpdateValidation, updateCourse);
router.delete('/:id', auth, requireTeacher, deleteCourse);

module.exports = router;

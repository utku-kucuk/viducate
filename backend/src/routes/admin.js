const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const {
  getPlatformStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getAllCoursesAdmin,
  deleteCourseAdmin,
  createUser,
  bulkCreateUsers,
  updateCourseAdmin,
  listCategories,
  createCategoryAdmin,
  deleteCategoryAdmin,
  listDepartments,
  createDepartmentAdmin,
  deleteDepartmentAdmin
} = require('../controllers/adminController');
const { body } = require('express-validator');
const multer = require('multer');

// Multer configuration for CSV file upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Validation rules
const roleValidation = [
  body('role').isIn(['student', 'teacher', 'admin']).withMessage('Role must be student, teacher, or admin')
];

// Platform statistics
router.get('/stats', auth, requireAdmin, getPlatformStats);

// User management
router.get('/users', auth, requireAdmin, getAllUsers);
router.get('/users/:id', auth, requireAdmin, getUserById);
router.post('/users', auth, requireAdmin, createUser);
router.post('/users/bulk', auth, requireAdmin, upload.single('file'), bulkCreateUsers);
router.put('/users/:id/role', auth, requireAdmin, roleValidation, updateUserRole);
router.delete('/users/:id', auth, requireAdmin, deleteUser);

// Course management
router.get('/courses', auth, requireAdmin, getAllCoursesAdmin);
router.delete('/courses/:id', auth, requireAdmin, deleteCourseAdmin);
router.put('/courses/:id', auth, requireAdmin, updateCourseAdmin);

// Category management
router.get('/categories', auth, requireAdmin, listCategories);
router.post('/categories', auth, requireAdmin, createCategoryAdmin);
router.delete('/categories/:id', auth, requireAdmin, deleteCategoryAdmin);

// Department management
router.get('/departments', auth, requireAdmin, listDepartments);
router.post('/departments', auth, requireAdmin, createDepartmentAdmin);
router.delete('/departments/:id', auth, requireAdmin, deleteDepartmentAdmin);

module.exports = router;

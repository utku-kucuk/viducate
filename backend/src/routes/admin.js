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
  deleteCourseAdmin
} = require('../controllers/adminController');
const { body } = require('express-validator');

// Validation rules
const roleValidation = [
  body('role').isIn(['student', 'teacher', 'admin']).withMessage('Role must be student, teacher, or admin')
];

// Platform statistics
router.get('/stats', auth, requireAdmin, getPlatformStats);

// User management
router.get('/users', auth, requireAdmin, getAllUsers);
router.get('/users/:id', auth, requireAdmin, getUserById);
router.put('/users/:id/role', auth, requireAdmin, roleValidation, updateUserRole);
router.delete('/users/:id', auth, requireAdmin, deleteUser);

// Course management
router.get('/courses', auth, requireAdmin, getAllCoursesAdmin);
router.delete('/courses/:id', auth, requireAdmin, deleteCourseAdmin);

module.exports = router;

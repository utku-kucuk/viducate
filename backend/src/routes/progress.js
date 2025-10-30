const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { auth, requireStudent, requireTeacher } = require('../middleware/auth');
const { validateProgress } = require('../middleware/validation');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// All routes require authentication
router.use(auth);

// Student routes
router.put('/video/:videoId', requireStudent, validateProgress, progressController.updateProgress);
router.get('/video/:videoId', requireStudent, progressController.getVideoProgress);
router.get('/user', requireStudent, progressController.getUserProgress);
router.get('/course/:courseId', requireStudent, progressController.getCourseProgress);
router.post('/video/:videoId/session', requireStudent, progressController.addWatchSession);
// Notes-only endpoint to avoid full progress validation
router.put(
  '/video/:videoId/notes',
  requireStudent,
  [body('notes').isString().withMessage('Notes must be a string')],
  handleValidationErrors,
  progressController.updateNotes
);

// Teacher routes
router.get('/student/:studentId/course/:courseId', requireTeacher, progressController.getStudentProgress);

module.exports = router;

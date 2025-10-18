const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { auth, requireStudent, requireTeacher } = require('../middleware/auth');
const { validateProgress } = require('../middleware/validation');

// All routes require authentication
router.use(auth);

// Student routes
router.put('/video/:videoId', requireStudent, validateProgress, progressController.updateProgress);
router.get('/video/:videoId', requireStudent, progressController.getVideoProgress);
router.get('/user', requireStudent, progressController.getUserProgress);
router.get('/course/:courseId', requireStudent, progressController.getCourseProgress);
router.post('/video/:videoId/session', requireStudent, progressController.addWatchSession);

// Teacher routes
router.get('/student/:studentId/course/:courseId', requireTeacher, progressController.getStudentProgress);

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { auth, requireTeacher, requireStudent } = require('../middleware/auth');
const quizController = require('../controllers/quizController');

// Teacher endpoints
router.post('/', auth, requireTeacher, quizController.createQuiz);
router.post('/:quizId/questions', auth, requireTeacher, quizController.addQuestionToQuiz);
router.post('/:quizId/assign', auth, requireTeacher, quizController.assignQuizToVideo);

// Student endpoints
router.get('/video/:videoId', auth, requireStudent, quizController.getVideoQuiz);
router.post('/:quizId/attempts', auth, requireStudent, quizController.startAttempt);
router.post('/attempts/:attemptId/submit', auth, requireStudent, quizController.submitAttempt);

// Upload quiz question image
const quizImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/thumbnails/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'quiz-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadQuizImage = multer({
  storage: quizImageStorage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/upload-image', auth, requireTeacher, uploadQuizImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    const imageUrl = `/uploads/thumbnails/${req.file.filename}`;
    res.json({ success: true, data: { url: imageUrl, filename: req.file.filename, size: req.file.size } });
  } catch (error) {
    console.error('Quiz image upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

module.exports = router;




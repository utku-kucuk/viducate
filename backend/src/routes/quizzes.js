const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { auth, requireTeacher, requireStudent } = require('../middleware/auth');
const quizController = require('../controllers/quizController');

// Teacher endpoints
router.post('/', auth, requireTeacher, quizController.createQuiz);
router.get('/my', auth, requireTeacher, quizController.listMyQuizzes);
router.get('/:quizId', auth, requireTeacher, quizController.getQuizDetail);
router.put('/:quizId', auth, requireTeacher, quizController.updateQuiz);
router.delete('/:quizId', auth, requireTeacher, quizController.deleteQuiz);
router.post('/:quizId/questions', auth, requireTeacher, quizController.addQuestionToQuiz);
router.post('/:quizId/assign', auth, requireTeacher, quizController.assignQuizToVideo);
router.post('/:quizId/assign-to-courses', auth, requireTeacher, quizController.assignQuizToCourses);
router.delete('/:quizId/assignments', auth, requireTeacher, quizController.unassignQuizFromVideo);
router.delete('/:quizId/assignments/by-course/:courseId', auth, requireTeacher, quizController.unassignQuizFromCourse);
router.post('/:quizId/assign-to-videos', auth, requireTeacher, quizController.assignQuizToVideos);
router.put('/:quizId/questions/:questionId', auth, requireTeacher, quizController.updateQuestion);
router.delete('/:quizId/questions/:questionId', auth, requireTeacher, quizController.deleteQuestion);

// Student endpoints
router.get('/video/:videoId', auth, requireStudent, quizController.getVideoQuiz);
router.post('/:quizId/attempts', auth, requireStudent, quizController.startAttempt);
router.post('/attempts/:attemptId/submit', auth, requireStudent, quizController.submitAttempt);

// Upload quiz question image
const quizImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const dest = path.join('uploads', 'thumbnails');
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (e) {
      cb(e);
    }
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
    // Use actual saved file path from multer to avoid cwd issues
    const inputPath = req.file.path;
    const uploadsDir = path.dirname(inputPath);
    const parsed = path.parse(req.file.filename);
    const outputFilename = `${parsed.name}.webp`;
    const outputPath = path.join(uploadsDir, outputFilename);
    
    try {
      // Optimize: resize within 1200x1200, convert to webp
      await sharp(inputPath)
        .rotate() // respect EXIF
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outputPath);
      
      // Remove original file to save space
      try { await fs.promises.unlink(inputPath); } catch (_) {}
      
      const imageUrl = `/uploads/thumbnails/${outputFilename}`;
      const stats = await fs.promises.stat(outputPath).catch(() => null);
      return res.json({ success: true, data: { url: imageUrl, filename: outputFilename, size: stats?.size || req.file.size } });
    } catch (procErr) {
      console.warn('Image optimization failed, returning original file:', procErr?.message || procErr);
      // Fallback: return original file as-is
      const imageUrl = `/uploads/thumbnails/${req.file.filename}`;
      return res.json({ success: true, data: { url: imageUrl, filename: req.file.filename, size: req.file.size } });
    }
  } catch (error) {
    console.error('Quiz image upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

module.exports = router;




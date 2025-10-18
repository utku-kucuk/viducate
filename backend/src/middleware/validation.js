const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('=== VALIDATION ERRORS ===');
    console.log('Request body:', req.body);
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('role')
    .optional()
    .isIn(['student', 'teacher'])
    .withMessage('Role must be either student or teacher'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Course validation rules
const validateCourse = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Course title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Level must be beginner, intermediate, or advanced'),
  handleValidationErrors
];

// Video validation rules
const validateVideo = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Video title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('duration')
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
  handleValidationErrors
];

// Progress validation rules
const validateProgress = [
  body('watchDuration')
    .isFloat({ min: 0 })
    .withMessage('Watch duration must be a non-negative number'),
  body('totalDuration')
    .isFloat({ min: 0.1 })
    .withMessage('Total duration must be a positive number'),
  body('watchPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Watch percentage must be between 0 and 100'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  body('consecutiveWatchTime')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Consecutive watch time must be a non-negative number'),
  body('pauseCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Pause count must be a non-negative integer'),
  body('seekCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Seek count must be a non-negative integer'),
  body('replayCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Replay count must be a non-negative integer'),
  body('lastSessionDuration')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Last session duration must be a non-negative number'),
  body('playCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Play count must be a positive integer'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateCourse,
  validateVideo,
  validateProgress,
  validate: handleValidationErrors
};

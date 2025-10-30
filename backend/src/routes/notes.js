const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const notesController = require('../controllers/notesController');

router.use(auth);

router.get('/', notesController.listNotes);
router.post(
  '/',
  [
    body('title').isString().isLength({ min: 1, max: 255 }),
    body('description').optional().isString(),
    body('content').isString().isLength({ min: 1 })
  ],
  handleValidationErrors,
  notesController.createNote
);
router.put(
  '/:id',
  [
    body('title').optional().isString().isLength({ min: 1, max: 255 }),
    body('description').optional().isString(),
    body('content').optional().isString().isLength({ min: 1 })
  ],
  handleValidationErrors,
  notesController.updateNote
);
router.delete('/:id', notesController.deleteNote);

module.exports = router;



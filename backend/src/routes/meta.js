const express = require('express');
const router = express.Router();
const { Category, Department } = require('../models');

// Public read-only lists (could be cached/client-side)
router.get('/categories', async (req, res) => {
  try {
    const items = await Category.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
});

router.get('/departments', async (req, res) => {
  try {
    const items = await Department.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load departments' });
  }
});

module.exports = router;



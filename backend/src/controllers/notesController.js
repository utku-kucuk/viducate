const { Note } = require('../models');

const listNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const notes = await Note.findAll({ where: { userId }, order: [['updatedAt', 'DESC']] });
    res.json({ notes });
  } catch (e) {
    console.error('List notes error:', e);
    res.status(500).json({ error: 'Failed to list notes.' });
  }
};

const createNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, content } = req.body;
    const note = await Note.create({ userId, title, description: description || null, content });
    res.status(201).json({ note });
  } catch (e) {
    console.error('Create note error:', e);
    res.status(500).json({ error: 'Failed to create note.' });
  }
};

const updateNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, content } = req.body;
    const note = await Note.findOne({ where: { id, userId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    await note.update({ title, description, content });
    res.json({ note });
  } catch (e) {
    console.error('Update note error:', e);
    res.status(500).json({ error: 'Failed to update note.' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const note = await Note.findOne({ where: { id, userId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    await note.destroy();
    res.json({ success: true });
  } catch (e) {
    console.error('Delete note error:', e);
    res.status(500).json({ error: 'Failed to delete note.' });
  }
};

module.exports = { listNotes, createNote, updateNote, deleteNote };



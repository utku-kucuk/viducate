import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Chip,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import axios from 'axios';

const VideoChapterManager = ({ videoId, onChaptersUpdated }) => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: ''
  });

  // Helper function to format time
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to parse time input (MM:SS format)
  const parseTimeInput = (timeString) => {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return 0;
  };

  // Helper function to format time for input (MM:SS format)
  const formatTimeForInput = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch chapters
  const fetchChapters = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/videos/${videoId}/chapters`);
      setChapters(response.data.data.chapters || []);
    } catch (err) {
      console.error('Error fetching chapters:', err);
      setError('Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  // Save chapters
  const saveChapters = async (updatedChapters) => {
    try {
      setLoading(true);
      await axios.put(`/api/videos/${videoId}/chapters`, {
        chapters: updatedChapters
      });
      
      setChapters(updatedChapters);
      if (onChaptersUpdated) {
        onChaptersUpdated(updatedChapters);
      }
      setError(null);
    } catch (err) {
      console.error('Error saving chapters:', err);
      setError('Failed to save chapters');
    } finally {
      setLoading(false);
    }
  };

  // Add new chapter
  const handleAddChapter = () => {
    setEditingChapter(null);
    setFormData({
      title: '',
      startTime: '',
      endTime: ''
    });
    setDialogOpen(true);
  };

  // Edit chapter
  const handleEditChapter = (chapter, index) => {
    setEditingChapter({ ...chapter, index });
    setFormData({
      title: chapter.title,
      startTime: formatTimeForInput(chapter.startTime),
      endTime: formatTimeForInput(chapter.endTime)
    });
    setDialogOpen(true);
  };

  // Delete chapter
  const handleDeleteChapter = (index) => {
    const updatedChapters = chapters.filter((_, i) => i !== index);
    saveChapters(updatedChapters);
  };

  // Save chapter (add or edit)
  const handleSaveChapter = () => {
    const startTime = parseTimeInput(formData.startTime);
    const endTime = parseTimeInput(formData.endTime);

    // Validation
    if (!formData.title.trim()) {
      setError('Chapter title is required');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be greater than start time');
      return;
    }

    // Check for overlapping chapters
    const newChapter = {
      title: formData.title.trim(),
      startTime,
      endTime
    };

    const updatedChapters = [...chapters];

    if (editingChapter !== null) {
      // Editing existing chapter
      updatedChapters[editingChapter.index] = newChapter;
    } else {
      // Adding new chapter
      updatedChapters.push(newChapter);
    }

    // Sort chapters by start time
    updatedChapters.sort((a, b) => a.startTime - b.startTime);

    saveChapters(updatedChapters);
    setDialogOpen(false);
    setFormData({ title: '', startTime: '', endTime: '' });
  };

  // Cancel dialog
  const handleCancelDialog = () => {
    setDialogOpen(false);
    setFormData({ title: '', startTime: '', endTime: '' });
    setError(null);
  };

  // Load chapters on component mount
  useEffect(() => {
    if (videoId) {
      fetchChapters();
    }
  }, [videoId]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Video Chapters
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddChapter}
          disabled={loading}
        >
          Add Chapter
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {chapters.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No chapters defined for this video. Add chapters to help students navigate through the content.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {chapters.map((chapter, index) => (
              <ListItem key={index} divider={index < chapters.length - 1}>
                <DragIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText
                  primary={chapter.title}
                  secondary={`${formatTime(chapter.startTime)} - ${formatTime(chapter.endTime)} (${formatTime(chapter.endTime - chapter.startTime)})`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleEditChapter(chapter, index)}
                    disabled={loading}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteChapter(index)}
                    disabled={loading}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Chapter Dialog */}
      <Dialog open={dialogOpen} onClose={handleCancelDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingChapter ? 'Edit Chapter' : 'Add New Chapter'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Chapter Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="e.g., SQL Introduction, Basic Commands, etc."
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Start Time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  placeholder="MM:SS"
                  helperText="Format: MM:SS (e.g., 00:30)"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="End Time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  placeholder="MM:SS"
                  helperText="Format: MM:SS (e.g., 05:45)"
                />
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveChapter} 
            variant="contained"
            disabled={loading}
          >
            {editingChapter ? 'Update' : 'Add'} Chapter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoChapterManager;

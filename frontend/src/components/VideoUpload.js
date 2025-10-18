import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  TextField,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  VideoLibrary as VideoIcon
} from '@mui/icons-material';
import axios from 'axios';

const VideoUpload = ({ courseId, onVideoUploaded }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });


  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill title from filename if title is empty
      if (!formData.title.trim()) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setFormData(prev => ({ ...prev, title: fileName }));
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a video file');
      return;
    }
    if (!formData.title.trim()) {
      setError('Please enter a video title');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const uploadData = new FormData();
      uploadData.append('video', file);
      uploadData.append('title', formData.title);
      uploadData.append('description', formData.description);
      uploadData.append('courseId', courseId);
      


      const response = await axios.post('/api/videos/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      setSuccess('Video uploaded successfully!');
      setFile(null);
      setFormData({ title: '', description: '' });

      
      if (onVideoUploaded) {
        onVideoUploaded(response.data.data);
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Upload Video</Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* File Upload */}
      <Box sx={{ mb: 3 }}>
        <input
          accept="video/*"
          style={{ display: 'none' }}
          id="video-file-input"
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="video-file-input">
          <Button
            variant="outlined"
            component="span"
            startIcon={<UploadIcon />}
            disabled={uploading}
            sx={{ mb: 2 }}
          >
            Select Video File
          </Button>
        </label>
        {file && (
          <Box sx={{ mt: 2 }}>
            <Chip
              icon={<VideoIcon />}
              label={`${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`}
              color="primary"
              variant="outlined"
            />
          </Box>
        )}
      </Box>
      
      {/* Form Fields */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Video Title *"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          sx={{ mb: 2 }}
          disabled={uploading}
          required
        />
        <TextField
          fullWidth
          label="Description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 2 }}
          disabled={uploading}
        />
      </Box>


      
      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Uploading... {progress}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}
      
      {/* Upload Button */}
      <Button
        variant="contained"
        onClick={handleUpload}
        disabled={!file || uploading}
        startIcon={<UploadIcon />}
        fullWidth
      >
        {uploading ? 'Uploading...' : 'Upload Video'}
      </Button>
    </Paper>
  );
};

export default VideoUpload;

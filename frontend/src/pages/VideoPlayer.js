import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Chip,
  Alert,
  Paper,
  LinearProgress
} from '@mui/material';
import { 
  ArrowBack,
  PlayArrow as PlayIcon,
  SkipNext as NextIcon
} from '@mui/icons-material';
import CourseSidebar from '../components/CourseSidebar';
import axios from 'axios';

const VideoPlayer = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  
  // Video data states
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [nextVideo, setNextVideo] = useState(null);
  
  // Player states
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Progress tracking states
  const [isWatching, setIsWatching] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [lastCurrentTime, setLastCurrentTime] = useState(0);
  const [isCurrentlyWatching, setIsCurrentlyWatching] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);



  // Refs to avoid stale closures inside event handlers
  const videoRef = useRef(null);
  
  // UI states
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  // Helper function to format time
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };




  // Fetch course data to determine next video
  const fetchCourseData = async (courseId) => {
    try {
      const response = await axios.get(`/api/courses/${courseId}`);
      const course = response.data.data;
      setCourseData(course);
      
      // Find all videos in the course and determine next video
      const allVideos = [];
      if (course.chapters && Array.isArray(course.chapters)) {
        course.chapters.forEach(chapter => {
          if (chapter.sections && Array.isArray(chapter.sections)) {
            chapter.sections.forEach(section => {
              if (section.videos && Array.isArray(section.videos)) {
                section.videos.forEach(video => {
                  allVideos.push({
                    ...video,
                    chapterTitle: chapter.title,
                    sectionTitle: section.title
                  });
                });
              }
            });
          }
        });
      }
      
      // Sort videos by order
      allVideos.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Find current video index and next video
      const currentIndex = allVideos.findIndex(video => video.id === videoId);
      if (currentIndex !== -1 && currentIndex < allVideos.length - 1) {
        setNextVideo(allVideos[currentIndex + 1]);
      } else {
        setNextVideo(null); // No next video (last video in course)
      }
    } catch (err) {
      console.error('Error fetching course data:', err);
    }
  };

  // Fetch video data
  const fetchVideoData = async () => {
    try {
      setLoading(true);
      console.log('Fetching video data for ID:', videoId);
      const response = await axios.get(`/api/videos/${videoId}`);
      console.log('Video data response:', response.data);
      const video = response.data.data;
      console.log('Video data set:', video);
      setVideoData(video);
      
      // Initialize progress data
      if (video.progress) {
        console.log('Progress data found:', video.progress);
        setNotes(video.progress.notes || '');
        setCurrentProgress(video.progress.watchPercentage || 0);
        setIsCompleted(video.progress.isCompleted || false);
        
        // If video is completed, ensure it stays completed
        if (video.progress.isCompleted) {
          console.log('Video is already completed, maintaining completion status');
        }
      }
      
      // Fetch course data to determine next video
      if (video.courseId) {
        await fetchCourseData(video.courseId);
      }
    } catch (err) {
      console.error('Error fetching video:', err);
      setError('Failed to load video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save progress to backend
  const saveProgress = async () => {
    if (!videoData || !duration) return;

    try {
      // Calculate progress percentage based on current time
      const watchPercentage = (currentTime / duration) * 100;

      const progressData = {
        watchDuration: currentTime,
        totalDuration: duration,
        watchPercentage: watchPercentage
      };

      console.log('Saving progress:', progressData);

      const response = await axios.put(`/api/progress/video/${videoId}`, progressData);
      
      if (response.data.progress) {
        // Check if video was just completed
        const wasCompleted = isCompleted;
        const isNowCompleted = response.data.progress.isCompleted || false;
        
        // Update progress state with server response
        setCurrentProgress(response.data.progress.watchPercentage || 0);
        setIsCompleted(isNowCompleted);
        
        // Show completion notification if video was just completed
        if (!wasCompleted && isNowCompleted) {
          setShowCompletionNotification(true);
          // Hide notification after 5 seconds
          setTimeout(() => setShowCompletionNotification(false), 5000);
        }
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  // Save notes
  const saveNotes = async () => {
    if (!videoData) return;

    try {
      setSavingNotes(true);
      await axios.put(`/api/progress/video/${videoId}`, { notes });
      alert('Notes saved successfully!');
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  // Local Video Player Event Handlers
  const handleVideoLoad = (event) => {
    const video = event.target;
    setDuration(video.duration);
    setCurrentTime(video.currentTime);
    setPlayer(video);
  };

  const handleVideoTimeUpdate = (event) => {
    const video = event.target;
    const currentTime = video.currentTime;
    setCurrentTime(currentTime);
    
    // Update progress percentage
    if (duration > 0) {
      const progressPercentage = (currentTime / duration) * 100;
      setCurrentProgress(progressPercentage);
    }
    
    setLastCurrentTime(currentTime);
    
    // Save progress every 3 seconds
    if (Math.floor(currentTime) % 3 === 0 && currentTime !== lastSaveTime) {
      setLastSaveTime(currentTime);
      saveProgress();
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setIsWatching(true);
    setIsCurrentlyWatching(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    setIsWatching(false);
    setIsCurrentlyWatching(false);
    
    // Save progress when pausing
    saveProgress();
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setIsWatching(false);
    setIsCurrentlyWatching(false);
    
    // Force save progress when video ends to ensure completion status is saved
    setTimeout(() => {
      saveProgress();
    }, 1000);
    saveProgress();
  };

  // Fetch video data on component mount
  useEffect(() => {
    console.log('VideoPlayer mounted with videoId:', videoId);
    fetchVideoData();
  }, [videoId]);



  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Loading video...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  if (!videoData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Video not found or loading...</Typography>
        <Typography variant="body2" color="textSecondary">
          Video ID: {videoId}
        </Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Course Sidebar */}
      <CourseSidebar 
        courseData={courseData} 
        currentVideoId={videoId}
        onVideoSelect={(video) => navigate(`/video/${video.id}`)}
      />
      
      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              sx={{ mb: 2 }}
            >
              Back to Course
            </Button>
            <Typography variant="h4" component="h1" gutterBottom>
              {videoData.title}
            </Typography>
            {videoData.description && (
              <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                {videoData.description}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Main Content */}
        <Box sx={{ flex: 1 }}>
          {/* Video Player */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Video File: {videoData.fileUrl}
            </Typography>
            
            {/* Local Video Player */}
            <Box sx={{ position: 'relative' }}>
              <video
                ref={videoRef}
                src={`${videoData.fileUrl}`}
                controls
                style={{ width: '100%', height: 'auto', maxHeight: '70vh' }}
                onLoadedMetadata={handleVideoLoad}
                onTimeUpdate={handleVideoTimeUpdate}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onEnded={handleVideoEnded}
              />
              
              {/* Custom Progress Bar Overlay */}
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                pointerEvents: 'none',
                zIndex: 10
              }}>
                <Box sx={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '12px',
                  right: '12px',
                  height: '4px',
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Next Video Button */}
          {nextVideo && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<NextIcon />}
                disabled={!isCompleted}
                onClick={() => navigate(`/video/${nextVideo.id}`)}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  bgcolor: isCompleted ? 'success.main' : 'grey.400',
                  '&:hover': {
                    bgcolor: isCompleted ? 'success.dark' : 'grey.500'
                  },
                  '&:disabled': {
                    bgcolor: 'grey.300',
                    color: 'grey.500'
                  }
                }}
              >
                {isCompleted ? 'Next Video' : 'Complete this video to unlock next video'}
              </Button>
              {nextVideo && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Next: {nextVideo.title}
                </Typography>
              )}
            </Box>
          )}

          {/* Course Completion Message */}
          {!nextVideo && isCompleted && (
            <Box sx={{ mb: 3, textAlign: 'center', p: 3, bgcolor: 'success.light', borderRadius: 2 }}>
              <Typography variant="h6" color="success.dark" sx={{ fontWeight: 'bold', mb: 1 }}>
                🎉 Congratulations!
              </Typography>
              <Typography variant="body1" color="success.dark">
                You have completed this course!
              </Typography>
            </Box>
          )}

          {/* Progress Information */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Video Progress
              </Typography>
              {isCompleted && (
                <Chip 
                  label="✅ COMPLETED" 
                  color="success" 
                  variant="filled"
                  sx={{ fontWeight: 'bold' }}
                />
              )}
            </Box>
            
            {/* Progress Summary */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Progress Summary:</strong>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    Video Watched:
                  </Typography>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      border: '2px solid #ccc',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isCompleted ? '#4caf50' : 'transparent',
                      color: isCompleted ? 'white' : 'transparent'
                    }}
                  >
                    {isCompleted && '✓'}
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Current Time: {formatTime(currentTime)} | 
                Duration: {formatTime(duration)} | 
                Watched: {formatTime(currentTime)} | 
                Progress: {typeof currentProgress === 'number' ? currentProgress.toFixed(1) : '0.0'}%
              </Typography>
              {isWatching && (
                <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                  🎬 Currently watching
                </Typography>
              )}
              {isCompleted && (
                <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 'bold' }}>
                  🎉 Congratulations! You have completed this video!
                </Typography>
              )}
            </Box>

            {/* Progress Bar */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Video Progress Timeline (Duration: {formatTime(duration)})
              </Typography>
              
              <Box sx={{ 
                width: '100%', 
                height: 24, 
                backgroundColor: 'grey.300', 
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #ddd'
              }}>
                {/* Progress bar - show current progress as green, unwatched as red */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: '0%',
                    width: `${Math.min(currentProgress, 100)}%`,
                    height: '100%',
                    backgroundColor: '#4caf50', // Green for watched progress
                    borderRadius: 1,
                    zIndex: 2
                  }}
                />
                
                {/* Unwatched portion - red background */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: '0%',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#f44336', // Red for unwatched
                    borderRadius: 1,
                    zIndex: 1
                  }}
                />
              </Box>
            </Box>

            {/* Progress Summary */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                Progress: {typeof currentProgress === 'number' ? currentProgress.toFixed(1) : '0.0'}% | 
                Total: {formatTime(duration)}
              </Typography>
            </Box>
          </Paper>

          {/* Next Video Section */}
          {isCompleted && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                🎉 Video Completed!
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Great job! You've completed this video. Ready for the next one?
              </Typography>
              <Button
                variant="contained"
                color="success"
                startIcon={<PlayIcon />}
                onClick={() => navigate(`/course/${videoData?.courseId}`)}
                fullWidth
              >
                Continue to Next Video
              </Button>
            </Paper>
          )}

          {/* Notes Section */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="Add your notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={saveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </Paper>
        </Box>
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default VideoPlayer;

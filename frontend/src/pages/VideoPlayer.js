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
  const [watchedSegments, setWatchedSegments] = useState([]);
  const [isWatching, setIsWatching] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [lastCurrentTime, setLastCurrentTime] = useState(0);
  const [isCurrentlyWatching, setIsCurrentlyWatching] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionNotification, setShowCompletionNotification] = useState(false);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [isTabVisible, setIsTabVisible] = useState(true);



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

  // Merge overlapping segments
  const mergeSegments = (segments) => {
    if (segments.length <= 1) return segments;
    
    const sorted = [...segments].sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      
      if (current.start <= last.end) {
        // Overlapping or adjacent segments, merge them
        last.end = Math.max(last.end, current.end);
      } else {
        // No overlap, add as new segment
        merged.push(current);
      }
    }
    return merged;
  };

  // Calculate unwatched segments
  const getUnwatchedSegments = () => {
    if (!duration) {
      return [{ start: 0, end: 0 }];
    }
    
    if (!watchedSegments.length) {
      return [{ start: 0, end: duration }];
    }
    
    const unwatched = [];
    let lastEnd = 0;
    
    // Sort segments by start time
    const sortedSegments = [...watchedSegments].sort((a, b) => a.start - b.start);
    
    sortedSegments.forEach(segment => {
      // If there's a gap before this segment, it's unwatched
      if (segment.start > lastEnd) {
        unwatched.push({ start: lastEnd, end: segment.start });
      }
      lastEnd = Math.max(lastEnd, segment.end);
    });
    
    // If there's unwatched time after the last segment
    if (lastEnd < duration) {
      unwatched.push({ start: lastEnd, end: duration });
    }
    
    return unwatched;
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
        setWatchedSegments(video.progress.watchedSegments || []);
        setMaxWatchedTime(video.progress.watchedDuration || 0);
        
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
      // Calculate total watched time from segments
      let totalWatchedTime = 0;
      watchedSegments.forEach(segment => {
        totalWatchedTime += (segment.end - segment.start);
      });

      // Use the maximum of current progress or previously watched time
      const finalWatchedTime = Math.max(totalWatchedTime, maxWatchedTime);
      const watchPercentage = (finalWatchedTime / duration) * 100;

      const progressData = {
        watchDuration: finalWatchedTime,
        totalDuration: duration,
        watchPercentage: watchPercentage,
        watchedSegments: watchedSegments
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
        setMaxWatchedTime(finalWatchedTime);
        
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
    
    // Update max watched time (progress never goes backward)
    setMaxWatchedTime(prev => Math.max(prev, currentTime));
    
    // If actively watching, add to watched segments
    if (isCurrentlyWatching && isTabVisible) {
      // Create a temporary segment for current watching session
      const currentSegment = { 
        start: Math.max(0, currentTime - 3), // Start 3 seconds back
        end: currentTime,
        isTemporary: true 
      };
      
      // Update watched segments
      setWatchedSegments(prev => {
        // Remove any existing temporary segments and add the new one
        const filtered = prev.filter(seg => !seg.isTemporary);
        return mergeSegments([...filtered, currentSegment]);
      });
    }
    
    // Update progress percentage based on max watched time (never goes backward)
    if (duration > 0) {
      const progressPercentage = (Math.max(currentTime, maxWatchedTime) / duration) * 100;
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
    // Finalize current watching session as permanent segment
    if (isCurrentlyWatching && currentTime > 0) {
      const finalSegment = {
        start: Math.max(0, currentTime - 3), // Last 3 seconds
        end: currentTime
      };
      
      setWatchedSegments(prev => {
        // Remove temporary segments and add final segment
        const filtered = prev.filter(seg => !seg.isTemporary);
        return mergeSegments([...filtered, finalSegment]);
      });
    }
    
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

  // Tab visibility and window focus control - pause video when tab is not visible or window loses focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, pause video
        if (isPlaying && player) {
          player.pause();
          setIsTabVisible(false);
        }
      } else {
        // Tab is visible again
        setIsTabVisible(true);
      }
    };

    const handleWindowBlur = () => {
      // Window loses focus, pause video
      if (isPlaying && player) {
        player.pause();
        setIsTabVisible(false);
      }
    };

    const handleWindowFocus = () => {
      // Window gains focus
      setIsTabVisible(true);
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isPlaying, player]);

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
                backgroundColor: '#e0e0e0', // Grey background
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #ddd'
              }}>
                {/* Watched segments - permanent green */}
                {watchedSegments
                  .filter(segment => !segment.isTemporary)
                  .map((segment, index) => {
                    const startPercent = (segment.start / duration) * 100;
                    const endPercent = (segment.end / duration) * 100;
                    const width = endPercent - startPercent;
                    
                    return (
                      <Box
                        key={`watched-${index}`}
                        sx={{
                          position: 'absolute',
                          left: `${startPercent}%`,
                          width: `${width}%`,
                          height: '100%',
                          backgroundColor: '#4caf50', // Green for watched
                          borderRadius: 1,
                          zIndex: 2
                        }}
                      />
                    );
                  })}
                
                {/* Current watching segment - lighter green */}
                {watchedSegments
                  .filter(segment => segment.isTemporary)
                  .map((segment, index) => {
                    const startPercent = (segment.start / duration) * 100;
                    const endPercent = (segment.end / duration) * 100;
                    const width = endPercent - startPercent;
                    
                    return (
                      <Box
                        key={`current-${index}`}
                        sx={{
                          position: 'absolute',
                          left: `${startPercent}%`,
                          width: `${width}%`,
                          height: '100%',
                          backgroundColor: '#66bb6a', // Lighter green for current
                          borderRadius: 1,
                          border: '2px solid #4caf50',
                          zIndex: 3
                        }}
                      />
                    );
                  })}
                
                {/* Unwatched segments - red (only for gaps between watched segments) */}
                {getUnwatchedSegments().map((segment, index) => {
                  const startPercent = (segment.start / duration) * 100;
                  const endPercent = (segment.end / duration) * 100;
                  const width = endPercent - startPercent;
                  
                  return (
                    <Box
                      key={`unwatched-${index}`}
                      sx={{
                        position: 'absolute',
                        left: `${startPercent}%`,
                        width: `${width}%`,
                        height: '100%',
                        backgroundColor: '#f44336', // Red for unwatched gaps
                        borderRadius: 1,
                        zIndex: 1
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* Progress Summary */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                Max Watched: {formatTime(maxWatchedTime)} | 
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

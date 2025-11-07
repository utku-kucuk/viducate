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
  Snackbar,
  Alert as MuiAlert,
  MenuItem,
  Menu,
  IconButton
} from '@mui/material';
import { 
  ArrowBack,
  PlayArrow as PlayIcon,
  SkipNext as NextIcon,
  Settings as SettingsIcon
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
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [qualityMenuAnchor, setQualityMenuAnchor] = useState(null);
  const isQualityMenuOpen = Boolean(qualityMenuAnchor);
  
  // Player states
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Progress tracking states
  const [watchedSegments, setWatchedSegments] = useState([]); // permanent watched
  const [currentWatchSegment, setCurrentWatchSegment] = useState(null); // active session
  const [isWatching, setIsWatching] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [isCurrentlyWatching, setIsCurrentlyWatching] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progressVersion, setProgressVersion] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const hasRefreshedSidebarForCompletionRef = useRef({});
  

  // Refs to avoid stale closures inside event handlers
  const videoRef = useRef(null);
  
  const sessionStartRef = useRef(null);
  const lastTimeRef = useRef(0);
  
  // UI states
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [autoSaveNotes, setAutoSaveNotes] = useState(true);
  const [isEditingNotes, setIsEditingNotes] = useState(true);
  const [lastNotesSavedAt, setLastNotesSavedAt] = useState(null);
  const [notesSavedOpen, setNotesSavedOpen] = useState(false);

  // Helper function to format time
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle quality change
  const handleQualityChange = async (newQuality) => {
    if (!videoData || !newQuality || newQuality === selectedQuality) return;
    await saveProgress();
    const videoEl = videoRef.current;
    const resumeTime = videoEl ? videoEl.currentTime : 0;
    const wasPlaying = isPlaying;

    try {
      let newVideoUrl = null;
      if (videoData.videoVariants && Array.isArray(videoData.videoVariants)) {
        const variant = videoData.videoVariants.find(v => v.quality === newQuality);
        if (variant && variant.url) newVideoUrl = variant.url;
      }
      if (!newVideoUrl) {
        const response = await axios.get(`/api/videos/${videoId}?quality=${newQuality}`);
        const vd = response.data.data;
        newVideoUrl = vd.selectedUrl || vd.fileUrl;
        setVideoData(vd);
      }
      if (!newVideoUrl) throw new Error('Video URL not found for selected quality');

      setSelectedQuality(newQuality);
      setCurrentVideoUrl(newVideoUrl);

      if (videoEl) {
        videoEl.pause();
        videoEl.src = newVideoUrl;
        videoEl.load();
        videoEl.addEventListener('loadeddata', () => {
          videoEl.currentTime = Math.min(resumeTime, videoEl.duration || 0);
          if (wasPlaying) {
            videoEl.play().catch(() => {});
          }
        }, { once: true });
      }
    } catch (err) {
      console.error('Error changing quality:', err);
      setError('Failed to change video quality. Please try again.');
      setSelectedQuality(selectedQuality);
    }
  };

  const handleOpenQualityMenu = (event) => setQualityMenuAnchor(event.currentTarget);
  const handleCloseQualityMenu = () => setQualityMenuAnchor(null);

  // No attachQualitySelector when using native controls

  // Merge overlapping segments
  const mergeSegments = (segments) => {
    if (segments.length <= 1) return segments;
    const sorted = [...segments].sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }
    return merged;
  };

  // Clamp segments to [0, duration]
  const clampSegmentsToDuration = (segments, dur) => {
    const safeDuration = Math.max(0, Number(dur) || 0);
    return (segments || [])
      .map(seg => {
        const start = Math.max(0, Math.min(safeDuration, Number(seg.start) || 0));
        const endRaw = Math.max(start, Number(seg.end) || start);
        const end = Math.min(safeDuration, endRaw);
        return { start, end };
      })
      .filter(seg => seg.end > seg.start);
  };

  // Utility to combine segments
  const getAllWatchedForCalc = () => {
    const parts = [...watchedSegments];
    if (currentWatchSegment && currentWatchSegment.end > currentWatchSegment.start) {
      parts.push({ start: currentWatchSegment.start, end: currentWatchSegment.end });
    }
    const clamped = clampSegmentsToDuration(parts, duration);
    return mergeSegments(clamped);
  };

  // Fetch course data to determine next video
  const fetchCourseData = async (courseId) => {
    try {
      const response = await axios.get(`/api/courses/${courseId}`);
      const course = response.data.data;
      setCourseData(course);
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
      allVideos.sort((a, b) => (a.order || 0) - (b.order || 0));
      const currentIndex = allVideos.findIndex(video => video.id === videoId);
      if (currentIndex !== -1 && currentIndex < allVideos.length - 1) {
        setNextVideo(allVideos[currentIndex + 1]);
      } else {
        setNextVideo(null);
      }
    } catch (err) {
      console.error('Error fetching course data:', err);
    }
  };

  // Fetch video data
  const fetchVideoData = async () => {
    try {
      setLoading(true);
      setError(null);
      setVideoData(null);
      setWatchedSegments([]);
      setCurrentWatchSegment(null);
      setIsCompleted(false);
      setCurrentProgress(0);
      setMaxWatchedTime(0);
      sessionStartRef.current = 0;
      lastTimeRef.current = 0;
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      let response;
      try {
        response = await axios.get(`/api/videos/${videoId}`);
      } catch (err) {
        if (err?.response?.status === 401 && token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          response = await axios.get(`/api/videos/${videoId}`);
        } else {
          throw err;
        }
      }
      const video = response.data.data;
      setVideoData(video);

      let qualities = [];
      if (video.availableQualities && Array.isArray(video.availableQualities) && video.availableQualities.length > 0) {
        qualities = video.availableQualities;
      } else if (video.videoVariants && Array.isArray(video.videoVariants) && video.videoVariants.length > 0) {
        qualities = video.videoVariants.map(v => v.quality || v).filter(Boolean);
      } else if (video.quality) {
        qualities = [video.quality];
      }
      setAvailableQualities(qualities);

      const initialQuality = video.currentQuality || (qualities.length > 0 ? qualities[qualities.length - 1] : null);
      setSelectedQuality(initialQuality);

      const videoUrl = video.selectedUrl || video.fileUrl || null;
      if (!videoUrl) {
        setError('Video URL not found. Please contact support.');
      }
      setCurrentVideoUrl(videoUrl);

      if (typeof video?.duration === 'number' && video.duration > 0) {
        setDuration(video.duration);
      }

      try {
        const token = localStorage.getItem('token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        const pgResp = await axios.get(`/api/progress/video/${videoId}`);
        const progress = pgResp?.data?.progress || null;
        if (progress) {
          setNotes(progress.notes || '');
          const baseDuration = typeof video?.duration === 'number' && video.duration > 0 ? video.duration : duration;
          const sanitized = mergeSegments(clampSegmentsToDuration(progress.watchedSegments || [], baseDuration));
          const totalWatched = sanitized.reduce((sum, s) => sum + (s.end - s.start), 0);
          const pct = baseDuration > 0 ? (totalWatched / baseDuration) * 100 : 0;
          setCurrentProgress(Math.min(Math.max(pct, 0), 100));
          setIsCompleted(Boolean(progress.isCompleted));
          setWatchedSegments(sanitized);
          setMaxWatchedTime(totalWatched);
          if (progress.isCompleted === true && videoId && !hasRefreshedSidebarForCompletionRef.current[videoId]) {
            hasRefreshedSidebarForCompletionRef.current[videoId] = true;
            setProgressVersion(v => v + 1);
          }
        }
      } catch (err) {
        console.error('Failed to fetch progress for video:', err);
      }

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

  // Native video element handles playback; no third-party init

  // Save progress to backend
  const saveProgress = async () => {
    if (!videoData || !duration) return;
    try {
      const combined = getAllWatchedForCalc();
      let totalWatchedTime = 0;
      combined.forEach(segment => { totalWatchedTime += (segment.end - segment.start); });
      const finalWatchedTime = Math.min(totalWatchedTime, duration);
      const calculatedPercentage = duration > 0 ? (finalWatchedTime / duration) * 100 : 0;
      const watchPercentage = Math.max(0, Math.min(calculatedPercentage, 100));
      const progressData = {
        watchDuration: finalWatchedTime,
        totalDuration: duration,
        watchPercentage,
        watchedSegments: combined
      };
      const response = await axios.put(`/api/progress/video/${videoId}`, progressData);
      if (response.data.progress) {
        const serverPct = Number(response.data.progress.watchPercentage || 0);
        const serverCompleted = Boolean(response.data.progress.isCompleted);
        setCurrentProgress(serverPct);
        setIsCompleted(serverCompleted);
        setMaxWatchedTime(finalWatchedTime);
        if (serverCompleted === true && videoId && !hasRefreshedSidebarForCompletionRef.current[videoId]) {
          hasRefreshedSidebarForCompletionRef.current[videoId] = true;
          setProgressVersion(v => v + 1);
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
      await axios.put(`/api/progress/video/${videoId}/notes`, { notes });
      setLastNotesSavedAt(new Date());
      setNotesSavedOpen(true);
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Local Video Player Event Handlers (compat with video.js events)
  const handleVideoLoad = (event) => {
    const video = event.target || videoRef.current;
    if (!video) return;
    setDuration(video.duration || (player?.duration ? player.duration() : 0));
    setCurrentTime(video.currentTime || 0);
    setPlayer(video);
  };

  const handleVideoTimeUpdate = (event) => {
    const video = event.target || videoRef.current;
    if (!video) return;
    const currentTime = video.currentTime;
    const durationLocal = video.duration || duration;
    setCurrentTime(currentTime || 0);
    lastTimeRef.current = currentTime || 0;
    setMaxWatchedTime(prev => Math.max(prev, currentTime || 0));
    if (isCurrentlyWatching && isTabVisible) {
      const start = typeof sessionStartRef.current === 'number' ? sessionStartRef.current : Math.max(0, currentTime || 0);
      setCurrentWatchSegment({ start, end: currentTime || 0, isTemporary: true });
    }
    if (durationLocal > 0) {
      const combined = getAllWatchedForCalc();
      let combinedWatched = 0;
      combined.forEach(seg => { combinedWatched += (seg.end - seg.start); });
      const calculatedPercentage = durationLocal > 0 ? (combinedWatched / durationLocal) * 100 : 0;
      const progressPercentage = Math.min(calculatedPercentage, 100);
      setCurrentProgress(progressPercentage);
      if (!isCompleted && progressPercentage >= 90) {
        saveProgress();
      }
    }
    if (Math.floor(currentTime || 0) % 3 === 0 && (currentTime || 0) !== lastSaveTime) {
      setLastSaveTime(currentTime || 0);
      saveProgress();
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setIsWatching(true);
    setIsCurrentlyWatching(true);
    const ct = videoRef.current ? videoRef.current.currentTime : 0;
    sessionStartRef.current = ct || 0;
  };

  const handleVideoPause = () => {
    if (currentWatchSegment && currentWatchSegment.end > currentWatchSegment.start) {
      setWatchedSegments(prev => mergeSegments([...prev, { start: currentWatchSegment.start, end: currentWatchSegment.end }]));
    }
    setCurrentWatchSegment(null);
    setIsPlaying(false);
    setIsWatching(false);
    setIsCurrentlyWatching(false);
    saveProgress();
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setIsWatching(false);
    setIsCurrentlyWatching(false);
    setTimeout(() => { saveProgress(); }, 1000);
    saveProgress();
  };

  const handleVideoSeeking = (event) => {
    if (currentWatchSegment && lastTimeRef.current > currentWatchSegment.start) {
      setWatchedSegments(prev => mergeSegments([...prev, { start: currentWatchSegment.start, end: lastTimeRef.current }]));
    }
    setCurrentWatchSegment(null);
    setIsCurrentlyWatching(false);
  };

  const handleVideoSeeked = (event) => {
    const t = event?.target?.currentTime || (videoRef.current ? videoRef.current.currentTime : 0) || 0;
    sessionStartRef.current = t || 0;
  };

  // Explicitly finalize then go to next video
  const handleGoToNext = async () => {
    if (currentWatchSegment && currentWatchSegment.end > currentWatchSegment.start) {
      await new Promise(resolve => {
        setWatchedSegments(prev => {
          const merged = mergeSegments([...prev, { start: currentWatchSegment.start, end: currentWatchSegment.end }]);
          resolve();
          return merged;
        });
      });
      setCurrentWatchSegment(null);
    }
    await saveProgress();
    if (nextVideo) {
      navigate(`/video/${nextVideo.id}`);
    }
  };

  // Tab visibility and focus control
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isPlaying && videoRef.current) {
          videoRef.current.pause();
          setIsTabVisible(false);
        }
      } else {
        setIsTabVisible(true);
      }
    };
    const handleWindowBlur = () => {
      if (isPlaying && videoRef.current) {
        videoRef.current.pause();
        setIsTabVisible(false);
      }
    };
    const handleWindowFocus = () => setIsTabVisible(true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isPlaying]);

  // Fetch video data on mount or id change
  useEffect(() => {
    fetchVideoData();
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save notes with debounce
  useEffect(() => {
    if (!autoSaveNotes || !videoData) return;
    const handler = setTimeout(() => { if (notes !== undefined) { saveNotes(); } }, 1200);
    return () => clearTimeout(handler);
  }, [notes, autoSaveNotes, videoData]);

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
        refreshKey={progressVersion}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                  {videoData.title}
                </Typography>
                {videoData.description && (
                  <Typography variant="body1" color="textSecondary">
                    {videoData.description}
                  </Typography>
                )}
              </Box>
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
                  Qualities: {availableQualities.length} | Variants: {videoData?.videoVariants?.length || 0}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Main Content */}
        <Box sx={{ flex: 1 }}>
          {/* Video Player */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <video
                ref={videoRef}
                id={`videojs-player-${videoId}`}
                className="native-player"
                controls
                playsInline
                preload="metadata"
                src={currentVideoUrl || ''}
                style={{ width: '100%', height: 'auto', maxHeight: '70vh' }}
                onLoadedMetadata={handleVideoLoad}
                onTimeUpdate={handleVideoTimeUpdate}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onEnded={handleVideoEnded}
                onSeeking={handleVideoSeeking}
                onSeeked={handleVideoSeeked}
              />

              {/* In-player Quality Menu Overlay */}
              {availableQualities.length > 1 && (
                <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 20, pointerEvents: 'auto' }}>
                  <IconButton 
                    size="small" 
                    onClick={handleOpenQualityMenu} 
                    sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                  >
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={qualityMenuAnchor}
                    open={isQualityMenuOpen}
                    onClose={handleCloseQualityMenu}
                    anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    MenuListProps={{ dense: true }}
                  >
                    {availableQualities.map((q) => (
                      <MenuItem 
                        key={q} 
                        selected={q === selectedQuality}
                        onClick={() => { handleQualityChange(q); handleCloseQualityMenu(); }}
                      >
                        {q}
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
              )}

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
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  {getAllWatchedForCalc().map((segment, index) => {
                    const startPercent = duration > 0 ? (segment.start / duration) * 100 : 0;
                    const endPercent = duration > 0 ? (segment.end / duration) * 100 : 0;
                    const width = Math.max(0, endPercent - startPercent);
                    return (
                      <Box
                        key={`mini-${index}`}
                        sx={{
                          position: 'absolute',
                          left: `${startPercent}%`,
                          width: `${width}%`,
                          height: '100%',
                          backgroundColor: '#fff',
                          borderRadius: '2px'
                        }}
                      />
                    );
                  })}
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
                onClick={handleGoToNext}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  bgcolor: isCompleted ? 'success.main' : 'grey.400',
                  '&:hover': { bgcolor: isCompleted ? 'success.dark' : 'grey.500' },
                  '&:disabled': { bgcolor: 'grey.300', color: 'grey.500' }
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
              <Typography variant="h6">Video Progress</Typography>
              {isCompleted && (
                <Chip label="✅ COMPLETED" color="success" variant="filled" sx={{ fontWeight: 'bold' }} />
              )}
            </Box>
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="textSecondary"><strong>Progress Summary:</strong></Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="textSecondary">Video Watched:</Typography>
                  <Box sx={{ width: 20, height: 20, border: '2px solid #ccc', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isCompleted ? '#4caf50' : 'transparent', color: isCompleted ? 'white' : 'transparent' }}>
                    {isCompleted && '✓'}
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Current Time: {formatTime(currentTime)} | 
                Duration: {formatTime(duration)} | 
                Watched: {formatTime(getAllWatchedForCalc().reduce((sum, s) => sum + (s.end - s.start), 0))} | 
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
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Video Progress Timeline (Duration: {formatTime(duration)})
              </Typography>
              <Box sx={{ width: '100%', height: 24, backgroundColor: '#e0e0e0', borderRadius: 2, position: 'relative', overflow: 'hidden', border: '1px solid #ddd' }}>
                {watchedSegments.map((segment, index) => {
                  const startPercent = (segment.start / duration) * 100;
                  const endPercent = (segment.end / duration) * 100;
                  const width = endPercent - startPercent;
                  return (
                    <Box key={`watched-${index}`} sx={{ position: 'absolute', left: `${startPercent}%`, width: `${width}%`, height: '100%', backgroundColor: '#4caf50', borderRadius: 1, zIndex: 2 }} />
                  );
                })}
                {currentWatchSegment && currentWatchSegment.end > currentWatchSegment.start && (() => {
                  const startPercent = (currentWatchSegment.start / duration) * 100;
                  const endPercent = (currentWatchSegment.end / duration) * 100;
                  const width = endPercent - startPercent;
                  return (
                    <Box key={`current-active`} sx={{ position: 'absolute', left: `${startPercent}%`, width: `${width}%`, height: '100%', backgroundColor: '#66bb6a', borderRadius: 1, border: '2px solid #4caf50', zIndex: 3 }} />
                  );
                })()}
              </Box>
            </Box>
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
              <Typography variant="h6" gutterBottom>🎉 Video Completed!</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Great job! You've completed this video. Ready for the next one?
              </Typography>
              <Button variant="contained" color="success" startIcon={<PlayIcon />} onClick={() => navigate(`/course/${videoData?.courseId}`)} fullWidth>
                Continue to Next Video
              </Button>
            </Paper>
          )}

          {/* Notes Section */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>Notes</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  {lastNotesSavedAt ? `Last saved: ${new Date(lastNotesSavedAt).toLocaleString()}` : 'Not saved yet'}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setIsEditingNotes(v => !v)}>
                  {isEditingNotes ? 'View' : 'Edit'}
                </Button>
                <Chip 
                  label={autoSaveNotes ? 'Auto Save: On' : 'Auto Save: Off'}
                  color={autoSaveNotes ? 'success' : 'default'}
                  onClick={() => setAutoSaveNotes(v => !v)}
                  variant={autoSaveNotes ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              </Box>
            </Box>
            {isEditingNotes ? (
              <>
                <TextField fullWidth multiline rows={4} variant="outlined" placeholder="Add your notes here..." value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mb: 2 }} />
                <Button variant="contained" onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </Button>
              </>
            ) : (
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {notes || 'No notes yet.'}
                </Typography>
              </Box>
            )}
          </Paper>
          <Snackbar open={notesSavedOpen} autoHideDuration={2000} onClose={() => setNotesSavedOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <MuiAlert elevation={6} variant="filled" severity="success" sx={{ width: '100%' }}>
              Notes saved
            </MuiAlert>
          </Snackbar>
        </Box>
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default VideoPlayer;

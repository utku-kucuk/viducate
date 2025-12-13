import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const CourseDetail = () => {
  const { id: courseId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const adminPreviewFlag = new URLSearchParams(location.search).get('adminPreview') === '1';
  
  const [course, setCourse] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [lastWatchedVideoId, setLastWatchedVideoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  // If redirected right after creating a course, hide enroll immediately for owner
  const ownerJustCreated = Boolean(useLocation().state?.ownerJustCreated);
  const [isTeacher, setIsTeacher] = useState(ownerJustCreated || false);
  const [isOwner, setIsOwner] = useState(ownerJustCreated || false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [flatVideos, setFlatVideos] = useState([]);
  const [videoQuizInfo, setVideoQuizInfo] = useState({});

  // Resolve a real video id from chapter video data produced at course creation
  const resolveVideoId = (chapterVideo) => {
    if (!course) return undefined;

    // If chapter video already has a valid ID, use it
    if (chapterVideo?.id) {
      // Validate it exists in course.videos if available
      if (Array.isArray(course.videos)) {
        const validIds = new Set(course.videos.map(v => v.id));
        if (validIds.has(chapterVideo.id)) {
          return chapterVideo.id;
        }
      } else {
        // If course.videos not available, trust the ID
        return chapterVideo.id;
      }
    }

    // If course.videos is not available, return undefined
    if (!Array.isArray(course.videos) || course.videos.length === 0) {
      return undefined;
    }

    // Build a lookup set of real ids for validation
    const validIds = new Set(course.videos.map(v => v.id));

    // Try to match by exact title only (no partial matching to avoid false positives)
    // If multiple videos have the same title, use order to distinguish them
    if (chapterVideo?.title) {
      const norm = (s) => String(s || '').trim().toLowerCase();
      // First try exact match (case-sensitive)
      let matches = course.videos.filter(v => v.title === chapterVideo.title);
      // Then try case-insensitive exact match
      if (matches.length === 0) {
        matches = course.videos.filter(v => norm(v.title) === norm(chapterVideo.title));
      }
      // If multiple matches, use order to find the correct one
      if (matches.length > 0) {
        if (matches.length === 1) {
          return matches[0].id;
        }
        // Multiple videos with same title - use order if available
        if (typeof chapterVideo.order === 'number') {
          const byOrder = matches.find(v => v.order === chapterVideo.order);
          if (byOrder) return byOrder.id;
        }
        // If order not available, return first match (fallback)
        return matches[0].id;
      }
    }

    // Try to match by filename if present (backend stores fileUrl like /uploads/videos/<filename>)
    if (chapterVideo?.fileName) {
      const byFile = course.videos.find(v => typeof v.fileUrl === 'string' && v.fileUrl.endsWith(`/${chapterVideo.fileName}`));
      if (byFile) return byFile.id;
    }

    // Try to match by fileUrl if present
    if (chapterVideo?.fileUrl) {
      const byUrl = course.videos.find(v => v.fileUrl === chapterVideo.fileUrl);
      if (byUrl) return byUrl.id;
    }

    // Last resort: loose match by order if present
    if (typeof chapterVideo?.order === 'number') {
      const byOrder = course.videos.find(v => v.order === chapterVideo.order);
      if (byOrder) return byOrder.id;
    }

    // If still no match, try to find by position in flatVideos
    if (flatVideos && flatVideos.length > 0) {
      // Try to find video by matching all properties
      const match = flatVideos.find(v => {
        if (chapterVideo?.title && v.title === chapterVideo.title) return true;
        if (chapterVideo?.fileUrl && v.fileUrl === chapterVideo.fileUrl) return true;
        return false;
      });
      if (match && match.id) return match.id;
    }

    return undefined;
  };

  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure we have authentication headers
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Admin preview ONLY when adminPreview flag is explicitly provided
      const useAdminPreview = adminPreviewFlag === true;
      const apiUrl = useAdminPreview ? `/api/courses/${courseId}?adminPreview=1` : `/api/courses/${courseId}`;
      
      const [courseResponse, progressResponse] = await Promise.all([
        axios.get(apiUrl).catch(err => {
          console.error('Error fetching course:', err);
          throw err;
        }),
        user?.role === 'student' 
          ? axios.get(`/api/progress/course/${courseId}`).catch(err => {
              console.warn('Error fetching progress (non-critical):', err);
              return { data: { data: [] } };
            })
          : Promise.resolve({ data: { data: [] } })
      ]);

      const courseData = courseResponse.data.data;
      setCourse(courseData);
      // Enrollment from server response only (single source of truth)
      const serverIsEnrolled = Boolean(courseResponse.data.data.isEnrolled);
      setIsEnrolled(serverIsEnrolled);
      // Role flags
      const ownerFlag = courseResponse.data.data.teacherId === user?.id;
      const adminFlag = user?.role === 'admin';
      setIsOwner(ownerFlag);
      setIsAdmin(adminFlag);
      // Only the course owner (teacher or admin who created it) OR explicit adminPreview can bypass locks
      setIsTeacher(Boolean(ownerFlag || adminPreviewFlag));
      // Build flattened video order for locking logic
      // Store videos with their original index and position to handle duplicate titles/videos
      let allVideos = [];
      let globalIndex = 0;
      if (courseData?.chapters && Array.isArray(courseData.chapters)) {
        courseData.chapters.forEach((chapter, chapterIdx) => {
          if (chapter.sections && Array.isArray(chapter.sections)) {
            chapter.sections.forEach((section, sectionIdx) => {
              if (section.videos && Array.isArray(section.videos)) {
                section.videos.forEach((video, videoIdx) => {
                  allVideos.push({ 
                    ...video, 
                    _originalIndex: globalIndex++,
                    _chapterIndex: chapterIdx,
                    _sectionIndex: sectionIdx,
                    _videoIndex: videoIdx
                  });
                });
              }
            });
          }
        });
      }
      // If chapter videos lack real ids, fall back to server videos list
      const hasRealIds = allVideos.some(v => v && v.id);
      if (!hasRealIds && Array.isArray(courseData.videos) && courseData.videos.length > 0) {
        allVideos = courseData.videos.map((v, idx) => ({ ...v, _originalIndex: idx }));
      }
      // sort by order if available, but preserve original index
      allVideos.sort((a, b) => (a.order || 0) - (b.order || 0));
      setFlatVideos(allVideos);
      
      const courseProgressList = progressResponse?.data?.progress || progressResponse?.data?.data || [];
      if (Array.isArray(courseProgressList)) {
        const progressMap = {};
        let latestVideoId = null;
        let latestTime = 0;
        courseProgressList.forEach(p => {
          if (!p || !p.videoId) return; // Skip invalid progress entries
          try {
            // Store progress by videoId (primary key)
            const vidId = String(p.videoId);
            progressMap[vidId] = p;
            // Also store by any matching IDs from all videos (including chapter videos) for easier lookup
            if (Array.isArray(allVideos)) {
              allVideos.forEach(v => {
                if (v && v.id && String(v.id) === vidId) {
                  progressMap[String(v.id)] = p;
                }
              });
            }
            // Also check courseData.videos if available
            if (Array.isArray(courseData.videos)) {
              courseData.videos.forEach(v => {
                if (v && v.id && String(v.id) === vidId) {
                  progressMap[String(v.id)] = p;
                }
              });
            }
            const ts = p.lastWatchedAt ? new Date(p.lastWatchedAt).getTime() : 0;
            if (ts > latestTime) {
              latestTime = ts;
              latestVideoId = p.videoId;
            }
          } catch (e) {
            console.warn('Error processing progress entry:', e, p);
          }
        });
        setUserProgress(progressMap);
        setLastWatchedVideoId(latestVideoId);
      }

      // Fetch quiz info for each resolved video id
      try {
        if (allVideos && allVideos.length > 0) {
          const quizPromises = allVideos
            .filter(video => video && video.id) // Only process videos with IDs
            .map(async (video) => {
              try {
                const resp = await axios.get(`/api/quizzes/video/${video.id}`);
                return { videoId: video.id, info: resp.data || { hasQuiz: false } };
              } catch (e) {
                // Return default for failed requests
                return { videoId: video.id, info: { hasQuiz: false } };
              }
            });
          const results = await Promise.allSettled(quizPromises);
          const map = {};
          results.forEach(r => { 
            if (r.status === 'fulfilled' && r.value) { 
              map[r.value.videoId] = r.value.info; 
            } 
          });
          setVideoQuizInfo(map);
        }
      } catch (e) {
        // ignore errors - don't break the page if quiz fetching fails
        console.warn('Error fetching quiz info:', e);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      if (error.response?.status === 401) {
        setError('Authentication required. Please login again.');
      } else {
        setError('Failed to load course data');
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, user, adminPreviewFlag]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Refresh course data when page becomes visible (user returns from video/file viewer)
  // Use ref to track last refresh time and prevent excessive refreshes
  const lastRefreshRef = React.useRef(0);
  useEffect(() => {
    let refreshTimeout = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading) {
        const now = Date.now();
        // Only refresh if at least 2 seconds have passed since last refresh
        if (now - lastRefreshRef.current < 2000) {
          return;
        }
        // Clear any pending refresh
        if (refreshTimeout) clearTimeout(refreshTimeout);
        // Small delay to ensure any pending API calls from other pages complete
        refreshTimeout = setTimeout(() => {
          lastRefreshRef.current = Date.now();
          fetchCourseData();
        }, 500);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCourseData, loading]);

  const isVideoUnlocked = (videoId, videoObj = null) => {
    if (isTeacher) return true;
    if (!videoId || !course) return false;
    // Always allow resuming the last watched video
    if (lastWatchedVideoId && String(videoId) === String(lastWatchedVideoId)) return true;
    if (!flatVideos.length) return false;
    
    // Resolve all video IDs to ensure we're using real IDs for comparison
    const resolvedVideos = flatVideos.map((v, idx) => {
      const resolvedId = resolveVideoId(v) || v.id;
      return { ...v, resolvedId, _flatIndex: idx };
    }).filter(v => v.resolvedId); // Only keep videos with valid resolved IDs
    
    if (resolvedVideos.length === 0) return false;
    
    // Find the index of the requested video in flatVideos array
    // CRITICAL: Use position (index) in the array, not just video ID
    // This ensures that even if the same video appears multiple times,
    // each occurrence is checked based on its position in the sequence
    let index = -1;
    
    // PRIORITY 1: Match by position (chapter/section/video index) - MOST RELIABLE for duplicate videos
    if (videoObj && typeof videoObj._chapterIndex === 'number' && typeof videoObj._sectionIndex === 'number' && typeof videoObj._videoIndex === 'number') {
      index = resolvedVideos.findIndex(v => 
        typeof v._chapterIndex === 'number' &&
        typeof v._sectionIndex === 'number' &&
        typeof v._videoIndex === 'number' &&
        v._chapterIndex === videoObj._chapterIndex &&
        v._sectionIndex === videoObj._sectionIndex &&
        v._videoIndex === videoObj._videoIndex
      );
    }
    
    // PRIORITY 2: Match by original index (handles duplicate titles)
    if (index === -1 && videoObj && typeof videoObj._originalIndex === 'number') {
      index = resolvedVideos.findIndex(v => v._originalIndex === videoObj._originalIndex);
    }
    
    // PRIORITY 3: If position info not available, we CANNOT reliably find the correct video
    // when duplicates exist. In this case, we must fail to prevent wrong video access.
    // Only allow ID-based matching if we're certain there are no duplicates
    if (index === -1) {
      // Count how many videos have the same ID
      const sameIdCount = resolvedVideos.filter(v => String(v.resolvedId) === String(videoId)).length;
      if (sameIdCount > 1) {
        // Multiple videos with same ID exist - cannot determine correct position without position info
        console.warn('Cannot determine video position: multiple videos with same ID exist and position info not available');
        return false; // Lock it to be safe
      }
      // Only one video with this ID exists, safe to match by ID
      index = resolvedVideos.findIndex(v => String(v.resolvedId) === String(videoId));
    }
    
    if (index === -1) return false; // Video not found in course
    
    // First video (index 0) is always unlocked for enrolled users
    if (index === 0) return true;
    
    // CRITICAL: Check completion based on POSITION in sequence, not video ID
    // Even if the same video appears at position 0 and position 3,
    // we need to check if videos at positions 0, 1, AND 2 are completed before unlocking position 3
    // Each position must be completed independently, regardless of video ID
    
    // Check ALL videos before the requested position
    // We need to verify that every single video from index 0 to index-1 is completed
    // IMPORTANT: Even if the same video ID appears at multiple positions,
    // we must check each position independently based on its position in the sequence
    for (let i = 0; i < index; i++) {
      const v = resolvedVideos[i];
      if (!v || !v.resolvedId) {
        // If video at position i is invalid, consider it incomplete
        return false;
      }
      
      // Check progress for this specific video at this specific position
      // NOTE: If the same video ID appears at multiple positions, we check progress
      // for that video ID. But we still require ALL previous positions to be completed
      // in sequence, regardless of video ID.
      const p = userProgress[String(v.resolvedId)];
      const completed = !!(p?.isCompleted || (p?.watchPercentage >= 90));
      
      if (!completed) {
        // If ANY video before the requested position is not completed, lock it
        // This ensures strict sequential progression, even for duplicate videos
        return false;
      }
    }
    
    // All previous videos (by position) are completed, unlock this video
    // This ensures that even if the same video appears at position 0 and position 3,
    // position 3 is only unlocked after positions 0, 1, and 2 are all completed
    return true;
  };


  const handleEnroll = async () => {
    try {
      // Ensure we have authentication headers
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      await axios.post(`/api/courses/${courseId}/enroll`);
      setIsEnrolled(true);
      setCourse(prev => ({ ...prev, studentCount: prev.studentCount + 1 }));
      
      // Refresh course data to get updated enrollment status
      await fetchCourseData();
    } catch (error) {
      console.error('Error enrolling in course:', error);
      if (error.response?.status === 401) {
        setError('Authentication required. Please login again.');
      } else {
        setError('Failed to enroll in course');
      }
    }
  };

  // formatDuration removed (unused)

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {t('courseDetail.loading')}
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!course) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{t('courseDetail.notFound')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Course Header */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          {course.thumbnail && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <img
                src={course.thumbnail}
                alt={course.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}
              />
            </Box>
          )}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                {course.title}
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                {course.description}
              </Typography>
              {course?.teacher && (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {t('courses.instructor')}: {course.teacher.firstName} {course.teacher.lastName}
                </Typography>
              )}
              
              <Box display="flex" gap={2} flexWrap="wrap" sx={{ mb: 2 }}>
                {course.category && (
                  <Chip label={course.category} color="primary" variant="outlined" />
                )}
                {course.department && (
                  <Chip label={course.department} color="info" variant="outlined" />
                )}
                {course.level && (
                  <Chip label={course.level} color="secondary" variant="outlined" />
                )}
                {course.isCompleted && (
                  <Chip label={t('courseDetail.completed')} color="success" variant="filled" sx={{ fontWeight: 'bold' }} />
                )}
              </Box>
              
              <Box display="flex" gap={3} sx={{ mb: 2 }}>
                {(() => {
                  // Build a flattened list of content
                  const items = [];
                  if (Array.isArray(course.chapters) && course.chapters.length > 0) {
                    course.chapters.forEach(ch => ch.sections?.forEach(sec => sec.videos?.forEach(v => items.push(v))));
                  } else if (Array.isArray(course.videos)) {
                    items.push(...course.videos);
                  } else if (Array.isArray(course.Videos)) {
                    items.push(...course.Videos);
                  }
                  // Determine files vs videos
                  const filesCount = items.filter(v => (v?.type === 'file') || /(\.pdf|\/uploads\/files\/)/i.test(String(v?.fileUrl || ''))).length;
                  const videosCount = items.length - filesCount;
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        {t('courseDetail.filesCount', { count: filesCount })}
                      </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {t('courseDetail.videosCount', { count: videosCount })}
                    </Typography>
                    </Box>
                  );
                })()}
                <Typography variant="body2" color="textSecondary">
                  {t('courseDetail.studentsEnrolled', { count: course.studentCount || 0 })}
                </Typography>
                {course.rating > 0 && (
                  <Typography variant="body2" color="textSecondary">
                    <strong>{course.rating}</strong> {t('courseDetail.rating', { rating: course.rating })}
                  </Typography>
                )}
              </Box>
            </Box>
            
            {/* Enroll button is shown if not enrolled and user is not the owner (teachers/admins can enroll in others' courses) */}
            {!isEnrolled && !isOwner && (
              <Button
                variant="contained"
                size="large"
                onClick={handleEnroll}
                sx={{ minWidth: 120 }}
              >
                {t('courseDetail.enrollNow')}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>


      {/* Course Content */}
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
            {t('courseDetail.courseContent')}
          </Typography>

          {course.chapters && course.chapters.length > 0 ? (
            <Box>
              {course.chapters.map((chapter, chapterIndex) => (
                <Accordion key={chapterIndex} defaultExpanded sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} sx={{ width: '100%' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('courseDetail.chapter', { index: chapterIndex + 1, title: chapter.title })}
                      </Typography>
                      <Chip 
                        label={t('courseDetail.sectionsCount', { count: chapter.sections?.length || 0 })} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {chapter.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {chapter.description}
                      </Typography>
                    )}
                    
                    {chapter.sections && chapter.sections.length > 0 ? (
                      <Box>
                        {chapter.sections.map((section, sectionIndex) => (
                          <Accordion key={sectionIndex} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Box display="flex" alignItems="center" gap={2} sx={{ width: '100%' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                  {t('courseDetail.section', { index: `${chapterIndex + 1}.${sectionIndex + 1}`, title: section.title })}
                                </Typography>
                                {(() => {
                                  const filesCount = (section.videos || []).filter(v => (v?.type === 'file') || /(\.pdf|\/uploads\/files\/)/i.test(String(v?.fileUrl || ''))).length;
                                  const videosCount = (section.videos || []).length - filesCount;
                                  return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Chip 
                                        label={t('courseDetail.filesCount', { count: filesCount })} 
                                        size="small" 
                                        color="info" 
                                        variant="outlined" 
                                      />
                                <Chip 
                                        label={t('courseDetail.videosCount', { count: videosCount })} 
                                  size="small" 
                                  color="secondary" 
                                  variant="outlined" 
                                />
                                    </Box>
                                  );
                                })()}
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              {section.description && (
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                  {section.description}
                                </Typography>
                              )}
                              
                              {section.videos && section.videos.length > 0 ? (
                                <List sx={{ p: 0 }}>
                                  {section.videos.map((video, videoIndex) => {
                                    const resolvedVideoId = resolveVideoId(video);
                                    // Try multiple ID formats to find progress
                                    const progressId = resolvedVideoId || video.id;
                                    const progress = userProgress[progressId] || userProgress[String(progressId)];
                                    // Check completion: either isCompleted flag OR watchPercentage >= 90
                                    const isCompleted = progress?.isCompleted || (progress?.watchPercentage >= 90);
                                  const isWatched = progress?.watchPercentage > 0;
                                  const quizInfo = videoQuizInfo[resolvedVideoId || video.id] || { hasQuiz: false };

                                    return (
                                      <React.Fragment key={`${chapterIndex}-${sectionIndex}-${videoIndex}-${resolvedVideoId || video.id || 'noid'}`}>
                                        <ListItem 
                                          sx={{ 
                                            px: 0,
                                            '&:hover': {
                                              bgcolor: 'action.hover',
                                              borderRadius: 1
                                            }
                                          }}
                                          onClick={(e) => {
                                            // Prevent ListItem click from interfering with button
                                            const target = e.target;
                                            if (target.closest('button')) {
                                              e.stopPropagation();
                                            }
                                          }}
                                        >
                                          <ListItemIcon>
                                            {isCompleted ? (
                                              <CheckIcon color="success" />
                                            ) : isWatched ? (
                                              <PlayIcon color="primary" />
                                            ) : (
                                              <PlayIcon color="disabled" />
                                            )}
                                          </ListItemIcon>
                                          
                                          <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                                              <Typography variant="body1" sx={{ fontWeight: isWatched ? 600 : 400 }}>
                                                {videoIndex + 1}. {video.title}
                                              </Typography>
                                              {/* Duration chip removed per request */}
                                              {isCompleted && (
                                                <Chip 
                                                  label={t('courseDetail.completed')} 
                                                  size="small" 
                                                  color="success"
                                                />
                                              )}
                                            </Box>
                                            
                                            {video.description && (
                                              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                                {video.description}
                                              </Typography>
                                            )}
                                            
                                            {isWatched && !isCompleted && (
                                              <Box sx={{ width: '100%', maxWidth: 200 }}>
                                                <LinearProgress 
                                                  variant="determinate" 
                                                  value={Number(progress?.watchPercentage) || 0} 
                                                  sx={{ height: 4, borderRadius: 2 }}
                                                />
                                                <Typography variant="caption" color="textSecondary">
                                                  {t('courseDetail.watchedPct', { pct: Math.round(progress?.watchPercentage || 0) })}
                                                </Typography>
                                              </Box>
                                            )}
                                          </Box>
                                          
                                          {(() => {
                                            const isFile = (video?.type === 'file') || /(\.pdf|\.pptx?|\/uploads\/files\/)/i.test(String(video?.fileUrl || ''));
                                            const base = isFile ? '/file/' : '/video/';
                                            const suffix = adminPreviewFlag ? '?adminPreview=1' : '';
                                            
                                            // Try to get video ID from multiple sources
                                            let videoIdToUse = resolvedVideoId;
                                            
                                            // If resolvedVideoId is not available, try to find it in course.videos
                                            if (!videoIdToUse && Array.isArray(course.videos) && course.videos.length > 0) {
                                              // Try to match by title
                                              const matchByTitle = course.videos.find(v => v.title === video.title);
                                              if (matchByTitle) {
                                                videoIdToUse = matchByTitle.id;
                                              } else {
                                                // Try to match by fileUrl
                                                if (video.fileUrl) {
                                                  const matchByUrl = course.videos.find(v => v.fileUrl === video.fileUrl);
                                                  if (matchByUrl) {
                                                    videoIdToUse = matchByUrl.id;
                                                  }
                                                }
                                              }
                                            }
                                            
                                            // If still no ID, try to get from flatVideos by position
                                            if (!videoIdToUse && flatVideos.length > 0) {
                                              const videoInFlat = flatVideos.find((v, idx) => {
                                                if (typeof v._chapterIndex === 'number' && typeof v._sectionIndex === 'number' && typeof v._videoIndex === 'number') {
                                                  if (v._chapterIndex === chapterIndex && 
                                                      v._sectionIndex === sectionIndex && 
                                                      v._videoIndex === videoIndex) {
                                                    return true;
                                                  }
                                                }
                                                return false;
                                              });
                                              if (videoInFlat && videoInFlat.id) {
                                                videoIdToUse = videoInFlat.id;
                                              }
                                            }
                                            
                                            // Final fallback: use video.id if available
                                            if (!videoIdToUse && video.id) {
                                              videoIdToUse = video.id;
                                            }
                                            
                                            const targetHref = videoIdToUse ? `${base}${videoIdToUse}${suffix}` : '#';
                                            
                                            // Check if this is the first video in the course
                                            const firstVideo = flatVideos.length > 0 ? flatVideos[0] : null;
                                            const isFirstVideo = firstVideo && (
                                              (videoIdToUse && String(firstVideo.id) === String(videoIdToUse)) ||
                                              (!videoIdToUse && firstVideo.title === video.title) ||
                                              (videoIndex === 0 && sectionIndex === 0 && chapterIndex === 0)
                                            );
                                            
                                            // Lock all items when not enrolled (unless teacher/admin)
                                            const baseLocked = !isTeacher && !isEnrolled;
                                            // If video is completed, always allow access (user can re-enter completed stages)
                                            const videoCompleted = isCompleted || (progress?.watchPercentage >= 90);
                                            
                                            // Find video in flatVideos by matching position
                                            const videoInFlat = flatVideos.find((v, idx) => {
                                              if (typeof v._chapterIndex === 'number' && typeof v._sectionIndex === 'number' && typeof v._videoIndex === 'number') {
                                                if (v._chapterIndex === chapterIndex && 
                                                    v._sectionIndex === sectionIndex && 
                                                    v._videoIndex === videoIndex) {
                                                  return true;
                                                }
                                              }
                                              return false;
                                            });
                                            
                                            // Use the found video from flatVideos (has position info) or create one with position info
                                            const videoForUnlock = videoInFlat || { 
                                              ...video, 
                                              _chapterIndex: chapterIndex,
                                              _sectionIndex: sectionIndex,
                                              _videoIndex: videoIndex,
                                              id: videoIdToUse
                                            };
                                            
                                            const sequentialLocked = !isTeacher && isEnrolled && !isFirstVideo && !videoCompleted && !isVideoUnlocked(videoIdToUse, videoForUnlock);
                                            
                                            // For teachers/owners, always allow access even if ID is not resolved
                                            // For enrolled students, allow if it's the first video or if ID is resolved
                                            const isLocked = isTeacher ? false : (
                                              (!videoIdToUse && !isFirstVideo) || 
                                              baseLocked || 
                                              sequentialLocked
                                            );
                                            
                                            // Debug logging
                                            if (!videoIdToUse && !isTeacher) {
                                              console.warn('Video ID not resolved:', {
                                                videoTitle: video.title,
                                                chapterIndex,
                                                sectionIndex,
                                                videoIndex,
                                                hasVideoId: !!video.id,
                                                hasResolvedId: !!resolvedVideoId,
                                                courseVideosCount: course.videos?.length || 0
                                              });
                                            }
                                            
                                            // Force enable button for teachers/owners even if ID not found
                                            const shouldEnableButton = isTeacher || videoIdToUse || isFirstVideo;
                                            const finalIsLocked = isTeacher ? false : (isLocked && !shouldEnableButton);
                                            
                                            const handleVideoClick = (e) => {
                                              // Prevent any default behavior
                                              if (e) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                              }
                                              
                                              // Force console log even if disabled
                                              console.log('=== START BUTTON CLICKED ===');
                                              console.log('Video:', video);
                                              console.log('Video ID to use:', videoIdToUse);
                                              console.log('Resolved Video ID:', resolvedVideoId);
                                              console.log('Target Href:', targetHref);
                                              console.log('Is Locked:', isLocked);
                                              console.log('Final Is Locked:', finalIsLocked);
                                              console.log('Is Teacher:', isTeacher);
                                              console.log('Is Enrolled:', isEnrolled);
                                              console.log('Base Locked:', baseLocked);
                                              console.log('Sequential Locked:', sequentialLocked);
                                              console.log('Should Enable Button:', shouldEnableButton);
                                              
                                              if (finalIsLocked) {
                                                console.warn('❌ Button is LOCKED');
                                                if (baseLocked) {
                                                  alert('Please enroll in the course first.');
                                                } else if (sequentialLocked) {
                                                  alert('Please complete previous videos first.');
                                                } else {
                                                  alert('Video is locked. Please refresh the page.');
                                                }
                                                return;
                                              }
                                              
                                              // Try to find ID one more time with more aggressive search
                                              let finalVideoId = videoIdToUse;
                                              
                                              if (!finalVideoId) {
                                                console.log('🔍 Video ID not found, trying aggressive search...');
                                                
                                                // Try video.id directly
                                                if (video.id) {
                                                  finalVideoId = video.id;
                                                  console.log('✅ Found ID in video.id:', finalVideoId);
                                                }
                                                
                                                // Try course.videos
                                                if (!finalVideoId && Array.isArray(course.videos)) {
                                                  const matchByTitle = course.videos.find(v => v.title === video.title);
                                                  if (matchByTitle && matchByTitle.id) {
                                                    finalVideoId = matchByTitle.id;
                                                    console.log('✅ Found ID in course.videos by title:', finalVideoId);
                                                  }
                                                  
                                                  // Try by fileUrl
                                                  if (!finalVideoId && video.fileUrl) {
                                                    const matchByUrl = course.videos.find(v => v.fileUrl === video.fileUrl);
                                                    if (matchByUrl && matchByUrl.id) {
                                                      finalVideoId = matchByUrl.id;
                                                      console.log('✅ Found ID in course.videos by URL:', finalVideoId);
                                                    }
                                                  }
                                                }
                                                
                                                // Try flatVideos
                                                if (!finalVideoId && flatVideos.length > 0) {
                                                  const matchInFlat = flatVideos.find(v => 
                                                    (v.title === video.title) || 
                                                    (v.fileUrl && video.fileUrl && v.fileUrl === video.fileUrl) ||
                                                    (v.id && video.id && String(v.id) === String(video.id))
                                                  );
                                                  if (matchInFlat && matchInFlat.id) {
                                                    finalVideoId = matchInFlat.id;
                                                    console.log('✅ Found ID in flatVideos:', finalVideoId);
                                                  }
                                                }
                                              }
                                              
                                              if (!finalVideoId && !isTeacher) {
                                                console.error('❌ All attempts to find video ID failed');
                                                console.log('Video object:', JSON.stringify(video, null, 2));
                                                console.log('Course videos count:', course.videos?.length || 0);
                                                console.log('Flat videos count:', flatVideos.length);
                                                alert('Video ID not found. Please refresh the page or contact support.');
                                                return;
                                              }
                                              
                                              // For teachers, try to navigate even without ID (will show error but at least tries)
                                              const finalHref = finalVideoId ? `${base}${finalVideoId}${suffix}` : (isTeacher ? `${base}${video.id || 'unknown'}${suffix}` : '#');
                                              
                                              console.log('🚀 Final Video ID:', finalVideoId);
                                              console.log('🚀 Final Href:', finalHref);
                                              
                                              if (finalHref === '#') {
                                                console.error('❌ Cannot navigate: no valid href');
                                                alert('Cannot open video. Please refresh the page.');
                                                return;
                                              }
                                              
                                              console.log('🚀 Attempting navigation to:', finalHref);
                                              
                                              try {
                                                navigate(finalHref);
                                                console.log('✅ Navigate() called successfully');
                                              } catch (err) {
                                                console.error('❌ Navigate error:', err);
                                                // Fallback to window.location
                                                console.log('🔄 Falling back to window.location.href');
                                                window.location.href = finalHref;
                                              }
                                            };
                                            
                                            // Debug: Log button state for ALL videos (first time only)
                                            React.useEffect(() => {
                                              if (videoIndex === 0 && sectionIndex === 0 && chapterIndex === 0) {
                                                console.log('=== FIRST VIDEO BUTTON STATE ===');
                                                console.log('Video Title:', video.title);
                                                console.log('Video ID:', video.id);
                                                console.log('Video ID to use:', videoIdToUse);
                                                console.log('Resolved Video ID:', resolvedVideoId);
                                                console.log('Is Locked:', isLocked);
                                                console.log('Final Is Locked:', finalIsLocked);
                                                console.log('Is Teacher:', isTeacher);
                                                console.log('Is Enrolled:', isEnrolled);
                                                console.log('Target Href:', targetHref);
                                                console.log('Course Videos:', course.videos?.map(v => ({ id: v.id, title: v.title })));
                                              }
                                            }, []);
                                            
                                            return (
                                              <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<PlayIcon />}
                                                disabled={finalIsLocked}
                                                title={finalIsLocked ? (baseLocked ? t('courseDetail.enrollNow') : (videoIdToUse ? t('courseDetail.unlockPrev') : 'Video ID not found')) : `Click to ${isWatched ? 'continue' : 'start'} video`}
                                                onClick={(e) => {
                                                  console.log('🔥 BUTTON onClick FIRED!');
                                                  handleVideoClick(e);
                                                }}
                                                onMouseDown={(e) => {
                                                  console.log('🖱️ Button mouse down event');
                                                  e.stopPropagation();
                                                }}
                                                onMouseUp={(e) => {
                                                  console.log('🖱️ Button mouse up event');
                                                  e.stopPropagation();
                                                }}
                                                onPointerDown={(e) => {
                                                  console.log('👆 Button pointer down event');
                                                }}
                                                sx={{
                                                  pointerEvents: finalIsLocked ? 'none' : 'auto',
                                                  cursor: finalIsLocked ? 'not-allowed' : 'pointer',
                                                  '&:hover': {
                                                    backgroundColor: finalIsLocked ? 'action.disabledBackground' : 'primary.dark'
                                                  },
                                                  '&:active': {
                                                    transform: finalIsLocked ? 'none' : 'scale(0.98)'
                                                  }
                                                }}
                                              >
                                                {isWatched ? t('courseDetail.continue') : t('courseDetail.start')}
                                              </Button>
                                            );
                                          })()}
                                          {/* Button end */}
                                          {/* 
                                            Note: Avoid using component={Link} for disabled buttons. 
                                            When Button renders as Link, disabled state does not reliably prevent navigation.
                                          */}
                                          {/* */}
                                          {/* */}
                                          {/* */}
                                          {/* */}
                                        </ListItem>
                                        
                                        {quizInfo.hasQuiz && (
                                          <List sx={{ p: 0 }}>
                                            <ListItem sx={{ px: 0 }}>
                                              <ListItemIcon>
                                                {quizInfo.passed ? <CheckIcon color="success" /> : <PlayIcon color={progress?.isCompleted ? 'primary' : 'disabled'} />}
                                              </ListItemIcon>
                                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {t('courseDetail.quizTitle', { title: quizInfo.quizTitle || 'Chapter quiz' })}
                                                  </Typography>
                                                  {quizInfo.isRequired && <Chip label={t('courseDetail.required')} size="small" />}
                                                  {quizInfo.passed && <Chip label={t('courseDetail.passed')} size="small" color="success" />}
                                                </Box>
                                              </Box>
                                              {(() => {
                                                const quizHref = resolvedVideoId && quizInfo?.quizId 
                                                  ? `/quiz/${quizInfo.quizId}?videoId=${resolvedVideoId}${adminPreviewFlag ? '&adminPreview=1' : ''}` 
                                                  : '#';
                                                const baseLocked = !isTeacher && !isEnrolled;
                                                // Find video in flatVideos by matching position (chapter/section/video index)
                                                // This ensures we get the correct video even if same video appears multiple times
                                                // CRITICAL: Must match by position to handle duplicate videos correctly
                                                const videoInFlatForQuiz = flatVideos.find((v, idx) => {
                                                  // PRIORITY 1: Match by position (most reliable for duplicate videos)
                                                  if (typeof v._chapterIndex === 'number' && typeof v._sectionIndex === 'number' && typeof v._videoIndex === 'number') {
                                                    if (v._chapterIndex === chapterIndex && 
                                                        v._sectionIndex === sectionIndex && 
                                                        v._videoIndex === videoIndex) {
                                                      return true;
                                                    }
                                                  }
                                                  // If position info not available in flatVideos, cannot reliably match
                                                  // Don't use fallback matching for duplicate videos
                                                  return false;
                                                });
                                                // Use the found video from flatVideos (has position info) or create one with position info
                                                const videoForUnlockQuiz = videoInFlatForQuiz || { 
                                                  ...video, 
                                                  _chapterIndex: chapterIndex,
                                                  _sectionIndex: sectionIndex,
                                                  _videoIndex: videoIndex
                                                };
                                                const seqLocked = !isTeacher && isEnrolled && !isVideoUnlocked(resolvedVideoId, videoForUnlockQuiz);
                                                const quizLocked = !resolvedVideoId || !quizInfo?.quizId || baseLocked || seqLocked || (!isTeacher && !(progress?.isCompleted));
                                                return (
                                                  <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<PlayIcon />}
                                                    disabled={quizLocked}
                                                    title={quizLocked ? (baseLocked ? t('courseDetail.enrollNow') : t('courseDetail.completePrevFirst')) : ''}
                                                    onClick={() => { if (!quizLocked) navigate(quizHref); }}
                                                  >
                                                    {quizInfo.passed ? t('courseDetail.reviewQuiz') : t('courseDetail.startQuiz')}
                                                  </Button>
                                                );
                                              })()}
                                            </ListItem>
                                          </List>
                                        )}

                                        {videoIndex < section.videos.length - 1 && <Divider />}
                                      </React.Fragment>
                                    );
                                  })}
                                </List>
                              ) : (
                                <Box textAlign="center" sx={{ py: 2 }}>
                                  <Typography variant="body2" color="textSecondary">
                                    {t('courseDetail.noVideosInSection')}
                                  </Typography>
                                  {isTeacher && (
                                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                      {t('courseDetail.noContentTeacher')}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Box>
                    ) : (
                      <Box textAlign="center" sx={{ py: 2 }}>
                        <Typography variant="body2" color="textSecondary">
                          {t('courseDetail.noSectionsInChapter')}
                        </Typography>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : course.videos && course.videos.length > 0 ? (
            // Fallback to old video list if no chapters
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                {t('courseDetail.courseContent')}
              </Typography>
              <List>
                {course.videos.map((video, index) => {
                  const progress = userProgress[video.id];
                  // Check completion: either isCompleted flag OR watchPercentage >= 90
                  const isCompleted = progress?.isCompleted || (progress?.watchPercentage >= 90);
                  const isWatched = progress?.watchPercentage > 0;

                  return (
                    <React.Fragment key={video.id}>
                      <ListItem 
                        sx={{ 
                          px: 0,
                          '&:hover': {
                            bgcolor: 'action.hover',
                            borderRadius: 1
                          }
                        }}
                      >
                        <ListItemIcon>
                          {isCompleted ? (
                            <CheckIcon color="success" />
                          ) : isWatched ? (
                            <PlayIcon color="primary" />
                          ) : (
                            <PlayIcon color="disabled" />
                          )}
                        </ListItemIcon>
                        
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: isWatched ? 600 : 400 }}>
                              {index + 1}. {video.title}
                            </Typography>
                            {/* Duration chip removed per request */}
                            {isCompleted && (
                              <Chip 
                                label={t('courseDetail.completed')} 
                                size="small" 
                                color="success"
                              />
                            )}
                          </Box>
                          
                          {video.description && (
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                              {video.description}
                            </Typography>
                          )}
                          
                          {isWatched && !isCompleted && (
                            <Box sx={{ width: '100%', maxWidth: 200 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={Number(progress?.watchPercentage) || 0} 
                                sx={{ height: 4, borderRadius: 2 }}
                              />
                              <Typography variant="caption" color="textSecondary">
                                {t('courseDetail.watchedPct', { pct: Math.round(progress?.watchPercentage || 0) })}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        
                        {(() => {
                          const locked = (!isEnrolled && !isTeacher) ? true : false;
                          const href = `/video/${video.id}`;
                          return (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<PlayIcon />}
                              disabled={locked}
                              onClick={() => { if (!locked) navigate(href); }}
                            >
                              {isWatched ? t('courseDetail.continue') : t('courseDetail.start')}
                            </Button>
                          );
                        })()}
                      </ListItem>
                      
                      {index < course.videos.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          ) : (
            <Box textAlign="center" sx={{ py: 4 }}>
              <Typography variant="h6" color="textSecondary">
                {t('courseDetail.noContentTitle')}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {isTeacher ? t('courseDetail.noContentTeacher') : t('courseDetail.noContentStudent')}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default CourseDetail;

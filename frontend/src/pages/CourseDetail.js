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
    if (!course || !Array.isArray(course.videos)) return undefined;

    // Build a lookup set of real ids for validation
    const validIds = new Set(course.videos.map(v => v.id));

    // If the chapter video already has an id, ensure it's a real stored video id
    if (chapterVideo?.id && validIds.has(chapterVideo.id)) {
      return chapterVideo.id;
    }

    // Try to match by exact title first
    if (chapterVideo?.title) {
      const norm = (s) => String(s || '').trim().toLowerCase();
      const byTitle = course.videos.find(v => v.title === chapterVideo.title)
        || course.videos.find(v => norm(v.title) === norm(chapterVideo.title))
        || course.videos.find(v => norm(v.title).includes(norm(chapterVideo.title)) || norm(chapterVideo.title).includes(norm(v.title)));
      if (byTitle) return byTitle.id;
    }

    // Try to match by filename if present (backend stores fileUrl like /uploads/videos/<filename>)
    if (chapterVideo?.fileName) {
      const byFile = course.videos.find(v => typeof v.fileUrl === 'string' && v.fileUrl.endsWith(`/${chapterVideo.fileName}`));
      if (byFile) return byFile.id;
    }

    // Last resort: loose match by order if present
    if (typeof chapterVideo?.order === 'number') {
      const byOrder = course.videos.find(v => v.order === chapterVideo.order);
      if (byOrder) return byOrder.id;
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
      let allVideos = [];
      if (courseData?.chapters && Array.isArray(courseData.chapters)) {
        courseData.chapters.forEach(chapter => {
          if (chapter.sections && Array.isArray(chapter.sections)) {
            chapter.sections.forEach(section => {
              if (section.videos && Array.isArray(section.videos)) {
                section.videos.forEach(video => {
                  allVideos.push(video);
                });
              }
            });
          }
        });
      }
      // If chapter videos lack real ids, fall back to server videos list
      const hasRealIds = allVideos.some(v => v && v.id);
      if (!hasRealIds && Array.isArray(courseData.videos) && courseData.videos.length > 0) {
        allVideos = [...courseData.videos];
      }
      // sort by order if available
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

  const isVideoUnlocked = (videoId) => {
    if (isTeacher) return true;
    // Always allow resuming the last watched video
    if (videoId && lastWatchedVideoId && videoId === lastWatchedVideoId) return true;
    if (!flatVideos.length) return false;
    let prefixCompleted = 0;
    for (let i = 0; i < flatVideos.length; i++) {
      const v = flatVideos[i];
      const p = userProgress[v.id];
      const completed = !!(p?.isCompleted || (p?.watchPercentage >= 90));
      if (completed) {
        prefixCompleted++;
      } else {
        break;
      }
    }
    const index = flatVideos.findIndex(v => v.id === videoId);
    if (index === -1) return false;
    return index <= prefixCompleted;
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
                                            const targetHref = resolvedVideoId ? `${base}${resolvedVideoId}${suffix}` : '#';
                                            // Lock all items when not enrolled (unless teacher/admin)
                                            const baseLocked = !isTeacher && !isEnrolled;
                                            // If video is completed, always allow access (user can re-enter completed stages)
                                            const videoCompleted = isCompleted || (progress?.watchPercentage >= 90);
                                            const sequentialLocked = !isTeacher && isEnrolled && !videoCompleted && !isVideoUnlocked(resolvedVideoId);
                                            const isLocked = !resolvedVideoId || baseLocked || sequentialLocked;
                                            return (
                                              <Button
                                                variant="contained"
                                                size="small"
                                                startIcon={<PlayIcon />}
                                                disabled={isLocked}
                                                title={isLocked ? (baseLocked ? t('courseDetail.enrollNow') : t('courseDetail.unlockPrev')) : ''}
                                                onClick={() => { if (!isLocked) navigate(targetHref); }}
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
                                                const seqLocked = !isTeacher && isEnrolled && !isVideoUnlocked(resolvedVideoId);
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

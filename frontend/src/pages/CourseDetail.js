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
import { Link, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const CourseDetail = () => {
  const { id: courseId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const adminPreviewFlag = new URLSearchParams(location.search).get('adminPreview') === '1';
  
  const [course, setCourse] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [lastWatchedVideoId, setLastWatchedVideoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
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
      
      // Ensure we have authentication headers
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Adminlar için her zaman adminPreview ile tam içerik getir
      const useAdminPreview = (user?.role === 'admin') || adminPreviewFlag;
      const apiUrl = useAdminPreview ? `/api/courses/${courseId}?adminPreview=1` : `/api/courses/${courseId}`;
      const [courseResponse, progressResponse, enrolledResp] = await Promise.all([
        axios.get(apiUrl),
        user?.role === 'student' ? axios.get(`/api/progress/course/${courseId}`) : Promise.resolve({ data: { data: [] } }),
        user?.role === 'student' ? axios.get('/api/courses/enrolled') : Promise.resolve({ data: { data: [] } })
      ]);

      const courseData = courseResponse.data.data;
      setCourse(courseData);
      // Derive enrollment robustly: prefer server field; fallback to enrolled list
      const serverIsEnrolled = Boolean(courseResponse.data.data.isEnrolled);
      let clientIsEnrolled = serverIsEnrolled;
      if (!serverIsEnrolled && enrolledResp?.data?.data) {
        clientIsEnrolled = Array.isArray(enrolledResp.data.data) && enrolledResp.data.data.some(c => c.id === courseId);
      }
      setIsEnrolled(clientIsEnrolled);
      // Admins should have full teacher-like access only when adminPreview=1
      setIsTeacher((user?.role === 'teacher' && courseResponse.data.data.teacherId === user.id) || (user?.role === 'admin'));
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
          progressMap[p.videoId] = p;
          const ts = p.lastWatchedAt ? new Date(p.lastWatchedAt).getTime() : 0;
          if (ts > latestTime) {
            latestTime = ts;
            latestVideoId = p.videoId;
          }
        });
        setUserProgress(progressMap);
        setLastWatchedVideoId(latestVideoId);
      }

      // Fetch quiz info for each resolved video id
      try {
        const quizPromises = allVideos.map(async (video) => {
          const resp = await axios.get(`/api/quizzes/video/${video.id}`);
          return { videoId: video.id, info: resp.data || { hasQuiz: false } };
        });
        const results = await Promise.allSettled(quizPromises);
        const map = {};
        results.forEach(r => { if (r.status === 'fulfilled') { map[r.value.videoId] = r.value.info; } });
        setVideoQuizInfo(map);
      } catch (e) {
        // ignore errors
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
  }, [courseId, user]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

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
                <Typography variant="body2" color="textSecondary">
                  <strong>{course.totalVideos || 0}</strong> {t('dashboard.videosCount', { count: course.totalVideos || 0 })}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <strong>{course.studentCount || 0}</strong> {t('courseDetail.studentsEnrolled', { count: course.studentCount || 0 })}
                </Typography>
                {course.rating > 0 && (
                  <Typography variant="body2" color="textSecondary">
                    <strong>{course.rating}</strong> {t('courseDetail.rating', { rating: course.rating })}
                  </Typography>
                )}
              </Box>
            </Box>
            
            {!isEnrolled && !isTeacher && (
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
                                <Chip 
                                  label={t('courseDetail.videosCount', { count: section.videos?.length || 0 })} 
                                  size="small" 
                                  color="secondary" 
                                  variant="outlined" 
                                />
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
                                    const progress = userProgress[resolvedVideoId || video.id];
                                    const isCompleted = progress?.isCompleted;
                                  const isWatched = progress?.watchPercentage > 0;
                                  const quizInfo = videoQuizInfo[resolvedVideoId || video.id] || { hasQuiz: false };

                                    return (
                                      <React.Fragment key={resolvedVideoId || video.id || `video-${videoIndex}`}>
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
                                          
                                          <Button
                                            component={Link}
                                            to={resolvedVideoId ? `/video/${resolvedVideoId}${(user?.role === 'admin' || adminPreviewFlag) ? '?adminPreview=1' : ''}` : '#'}
                                            variant="contained"
                                            size="small"
                                            startIcon={<PlayIcon />}
                                            disabled={!resolvedVideoId || (!isTeacher && (!isEnrolled || !isVideoUnlocked(resolvedVideoId)))}
                                            title={!isTeacher && !isVideoUnlocked(resolvedVideoId) ? t('courseDetail.unlockPrev') : ''}
                                          >
                                            {isWatched ? t('courseDetail.continue') : t('courseDetail.start')}
                                          </Button>
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
                                              <Button
                                                component={Link}
                                                to={resolvedVideoId && quizInfo?.quizId ? `/quiz/${quizInfo.quizId}?videoId=${resolvedVideoId}${(user?.role === 'admin' || adminPreviewFlag) ? '&adminPreview=1' : ''}` : '#'}
                                                variant="outlined"
                                                size="small"
                                                startIcon={<PlayIcon />}
                                              disabled={!resolvedVideoId || !quizInfo?.quizId || (!isTeacher && (!isEnrolled || !isVideoUnlocked(resolvedVideoId))) || (!isTeacher && !(progress?.isCompleted))}
                                              >
                                                {quizInfo.passed ? t('courseDetail.reviewQuiz') : t('courseDetail.startQuiz')}
                                              </Button>
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
                  const isCompleted = progress?.isCompleted;
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
                        
                        <Button
                          component={Link}
                          to={`/video/${video.id}`}
                          variant="contained"
                          size="small"
                          startIcon={<PlayIcon />}
                          disabled={!isEnrolled && !isTeacher}
                        >
                          {isWatched ? t('courseDetail.continue') : t('courseDetail.start')}
                        </Button>
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

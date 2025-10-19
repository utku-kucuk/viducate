import React, { useState, useEffect } from 'react';
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
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const CourseDetail = () => {
  const { id: courseId } = useParams();
  const { user } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [flatVideos, setFlatVideos] = useState([]);

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
      const byTitle = course.videos.find(v => v.title === chapterVideo.title);
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

  useEffect(() => {
    fetchCourseData();
  }, [courseId, user]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      
      // Ensure we have authentication headers
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const [courseResponse, progressResponse] = await Promise.all([
        axios.get(`/api/courses/${courseId}`),
        user?.role === 'student' ? axios.get(`/api/progress/course/${courseId}`) : Promise.resolve({ data: { data: [] } })
      ]);

      const courseData = courseResponse.data.data;
      setCourse(courseData);
      setIsEnrolled(courseResponse.data.data.isEnrolled);
      setIsTeacher(user?.role === 'teacher' && courseResponse.data.data.teacherId === user.id);
      // Build flattened video order for locking logic
      const allVideos = [];
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
      // sort by order if available
      allVideos.sort((a, b) => (a.order || 0) - (b.order || 0));
      setFlatVideos(allVideos);
      
      if (progressResponse.data.data) {
        const progressMap = {};
        progressResponse.data.data.forEach(progress => {
          progressMap[progress.videoId] = progress;
        });
        setUserProgress(progressMap);
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
  };

  const isVideoUnlocked = (videoId) => {
    if (isTeacher) return true;
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

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading course...
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
        <Alert severity="error">Course not found</Alert>
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
                <Chip label={course.category} color="primary" variant="outlined" />
                <Chip label={course.level} color="secondary" variant="outlined" />
                <Chip label="Free" color="success" />
              </Box>
              
              <Box display="flex" gap={3} sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  <strong>{course.totalVideos || 0}</strong> videos
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <strong>{course.studentCount || 0}</strong> students enrolled
                </Typography>
                {course.rating > 0 && (
                  <Typography variant="body2" color="textSecondary">
                    <strong>{course.rating}</strong> rating
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
                Enroll Now
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>


      {/* Course Content */}
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
            Course Content
          </Typography>

          {course.chapters && course.chapters.length > 0 ? (
            <Box>
              {course.chapters.map((chapter, chapterIndex) => (
                <Accordion key={chapterIndex} defaultExpanded sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={2} sx={{ width: '100%' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Chapter {chapterIndex + 1}: {chapter.title}
                      </Typography>
                      <Chip 
                        label={`${chapter.sections?.length || 0} sections`} 
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
                                  Section {chapterIndex + 1}.{sectionIndex + 1}: {section.title}
                                </Typography>
                                <Chip 
                                  label={`${section.videos?.length || 0} videos`} 
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
                                    const canWatch = (chapterIndex === 0 && sectionIndex === 0) || 
                                      (chapterIndex > 0 && course.chapters[chapterIndex - 1]?.sections?.every(s => 
                                        s.videos?.every(v => {
                                          const vId = resolveVideoId(v);
                                          return userProgress[vId || v.id]?.isCompleted;
                                        })
                                      )) ||
                                      (sectionIndex > 0 && chapter.sections[sectionIndex - 1]?.videos?.every(v => {
                                        const vId = resolveVideoId(v);
                                        return userProgress[vId || v.id]?.isCompleted;
                                      }));

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
                                                  label="Completed" 
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
                                                  {Math.round(progress?.watchPercentage || 0)}% watched
                                                </Typography>
                                              </Box>
                                            )}
                                          </Box>
                                          
                                          <Button
                                            component={Link}
                                            to={resolvedVideoId ? `/video/${resolvedVideoId}` : '#'}
                                            variant="contained"
                                            size="small"
                                            startIcon={<PlayIcon />}
                                            disabled={!resolvedVideoId || (!isEnrolled || !isVideoUnlocked(resolvedVideoId))}
                                            title={!isVideoUnlocked(resolvedVideoId) ? 'Complete previous videos to unlock' : ''}
                                          >
                                            {isWatched ? 'Continue' : 'Start'}
                                          </Button>
                                        </ListItem>
                                        
                                        {videoIndex < section.videos.length - 1 && <Divider />}
                                      </React.Fragment>
                                    );
                                  })}
                                </List>
                              ) : (
                                <Box textAlign="center" sx={{ py: 2 }}>
                                  <Typography variant="body2" color="textSecondary">
                                    No videos in this section yet
                                  </Typography>
                                  {isTeacher && (
                                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                      Upload videos to this section to make them available to students
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
                          No sections in this chapter yet
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
                Course Videos
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
                                label="Completed" 
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
                                {Math.round(progress?.watchPercentage || 0)}% watched
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
                          {isWatched ? 'Continue' : 'Start'}
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
                No content available yet
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {isTeacher ? 'Add chapters, sections and videos to get started!' : 'Content will be added by the instructor'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default CourseDetail;

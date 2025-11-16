import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Button,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  PlayCircle as PlayIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalVideos: 0,
    completedVideos: 0,
    totalWatchTime: 0,
    averageProgress: 0
  });
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure auth header on refresh
      try {
        const token = localStorage.getItem('token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      } catch {}

      // Fetch user's enrolled courses
      const coursesResponse = await axios.get('/api/courses/enrolled');
      const courses = coursesResponse.data.data || [];

      // Calculate stats
      let totalVideos = 0;
      let completedVideos = 0;
      let totalWatchTime = 0;
      let totalProgress = 0;
      let completedCoursesCount = 0;

      // Fetch progress for each course
      for (const course of courses) {
        if (course.videos) {
          totalVideos += course.videos.length;
        }

        // Get progress for this course
        try {
          const progressResponse = await axios.get(`/api/videos/course/${course.id}/progress`);
          const videosWithProgress = progressResponse.data.data || [];
          
          let courseProgress = 0;
          // Build a quick map for completion checks
          const progressByVideoId = new Map();
          for (const video of videosWithProgress) {
            if (video.Progress && video.Progress.length > 0) {
              const progress = video.Progress[0];
              if (progress.isCompleted) {
                completedVideos++;
              }
              totalWatchTime += (progress.watchedDuration || 0) / 3600; // Convert seconds to hours
              courseProgress += progress.watchPercentage || 0;
              progressByVideoId.set(video.id, progress);
            }
          }

          // Calculate average progress for this course
          if (course.videos && course.videos.length > 0) {
            courseProgress = Math.round(courseProgress / course.videos.length);
          }
          totalProgress += courseProgress;

          // Update course with progress
          course.progress = courseProgress;
          // Determine course completion: all videos/files completed AND all required quizzes passed
          let allVideosCompleted = Array.isArray(course.videos) && course.videos.length > 0
            ? course.videos.every(v => {
                const p = progressByVideoId.get(v.id);
                return p && (Boolean(p.isCompleted) || Number(p.watchPercentage || 0) >= 90);
              })
            : false;
          let allRequiredQuizzesPassed = true;
          try {
            if (Array.isArray(course.videos) && course.videos.length > 0) {
              const quizChecks = await Promise.all(course.videos.map(async (v) => {
                try {
                  const resp = await axios.get(`/api/quizzes/video/${v.id}`);
                  const info = resp?.data || {};
                  if (info.hasQuiz && info.isRequired) {
                    return Boolean(info.passed);
                  }
                  return true;
                } catch {
                  // if failed to fetch quiz info, don't block completion
                  return true;
                }
              }));
              allRequiredQuizzesPassed = quizChecks.every(Boolean);
            }
          } catch {}
          course.completed = Boolean(allVideosCompleted && allRequiredQuizzesPassed);
          if (course.completed) completedCoursesCount++;
        } catch (error) {
          console.error(`Error fetching progress for course ${course.id}:`, error);
          course.progress = 0;
          course.completed = false;
        }
      }

      const averageProgress = courses.length > 0 ? Math.round(totalProgress / courses.length) : 0;

      setStats({
        totalCourses: courses.length,
        completedCourses: completedCoursesCount,
        totalVideos,
        completedVideos,
        totalWatchTime: Math.round(totalWatchTime * 10) / 10,
        averageProgress
      });

      // Set enrolled courses
      setEnrolledCourses(courses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        progress: course.progress || 0,
        completed: Boolean(course.completed),
        teacher: course.teacher,
        videoCount: course.videos ? course.videos.length : 0,
        thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPjMwMHg0NTA8L3RleHQ+Cjwvc3ZnPg=='
      })));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          {t('dashboard.welcome', { name: user?.firstName })}
        </Typography>
        <Typography variant="h6" color="textSecondary">
          {t('dashboard.continue')}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SchoolIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.totalCourses}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('dashboard.enrolledCourses')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PlayIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.totalVideos}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('dashboard.totalVideos')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.completedVideos}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('dashboard.completedVideos')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <ScheduleIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatDuration(stats.totalWatchTime)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('dashboard.totalWatchTime')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overall Progress */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('dashboard.overallProgress')}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={stats.averageProgress} 
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
          <Typography variant="body2" color="textSecondary">
            {t('dashboard.avgAcrossCourses', { pct: stats.averageProgress })}
          </Typography>
        </CardContent>
      </Card>

      {/* Enrolled Courses */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          {t('dashboard.yourEnrolled')}
        </Typography>
        
        {enrolledCourses.length > 0 ? (
          <Grid container spacing={3}>
            {enrolledCourses.map((course) => (
              <Grid item xs={12} md={6} key={course.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                        {course.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {course.completed && (
                          <Chip size="small" color="success" label={t('courseDetail.completed')} />
                        )}
                        <Chip 
                          label={`${course.videoCount} videos`} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    
                    {course.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {course.description}
                      </Typography>
                    )}
                    
                    {course.teacher && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        {t('dashboard.by', { first: course.teacher.firstName, last: course.teacher.lastName })}
                      </Typography>
                    )}
                    
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          {t('dashboard.progress')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {course.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={course.progress} 
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      {course.progress >= 100 && (
                        <Box sx={{ mt: 1 }}>
                          <Chip size="small" color="success" label={t('courseDetail.completed')} />
                        </Box>
                      )}
                    </Box>
                    
                    {course.completed ? (
                      <Button
                        component={Link}
                        to="/"
                        variant="contained"
                        fullWidth
                      >
                        {t('home.goToDashboard', 'Go to Dashboard')}
                      </Button>
                    ) : (
                      <Button
                        component={Link}
                        to={`/course/${course.id}`}
                        variant="contained"
                        fullWidth
                        startIcon={<PlayIcon />}
                      >
                        {t('dashboard.continueLearning')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {t('dashboard.noCoursesTitle')}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                {t('dashboard.noCoursesSubtitle')}
              </Typography>
              <Button
                component={Link}
                to="/courses"
                variant="contained"
                size="large"
              >
                {t('dashboard.browseCourses')}
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard;

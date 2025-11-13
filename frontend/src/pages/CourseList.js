import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  PlayCircle as PlayIcon,
  AccessTime as TimeIcon,
  Group as GroupIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const CourseList = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(['all']);
  const [departmentOptions, setDepartmentOptions] = useState(['all']);

  useEffect(() => {
    // Only fetch courses when user is authenticated
    if (isAuthenticated && user) {
      fetchMeta();
      fetchCourses();
    }
  }, [isAuthenticated, user]);

  const fetchMeta = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const [cats, deps] = await Promise.allSettled([
        axios.get('/api/meta/categories'),
        axios.get('/api/meta/departments')
      ]);
      if (cats.status === 'fulfilled') {
        const list = (cats.value?.data?.data || []).map(c => c.name).filter(Boolean);
        setCategoryOptions(['all', ...Array.from(new Set(list))]);
      }
      if (deps.status === 'fulfilled') {
        const list = (deps.value?.data?.data || []).map(d => d.name).filter(Boolean);
        setDepartmentOptions(['all', ...Array.from(new Set(list))]);
      }
    } catch {
      // ignore meta failures; filters will be minimal
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const response = await axios.get('/api/courses');
      const coursesData = response.data.data || [];

      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const levels = ['all', 'beginner', 'intermediate', 'advanced'];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || (course.category || '') === categoryFilter;
    const matchesDepartment = departmentFilter === 'all' || (course.department || '') === departmentFilter;
    const matchesLevel = levelFilter === 'all' || course.level === levelFilter;
    
    return matchesSearch && matchesCategory && matchesDepartment && matchesLevel;
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '0h';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
    }
    return `${minutes}m`;
  };


  const getTotalDuration = (videos) => {
    if (!videos || videos.length === 0) return 0;
    return videos.reduce((total, video) => total + (video.duration || 0), 0);
  };

  // Show loading while authentication is being checked
  if (!isAuthenticated) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchCourses}>
          {t('courses.retry')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 600 }}>
        {t('courses.browse')}
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label={t('courses.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>{t('courses.category')}</InputLabel>
              <Select
                value={categoryFilter}
                label={t('courses.category')}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categoryOptions.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category === 'all' ? t('courses.allCategories') : category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentFilter}
                label="Department"
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                {departmentOptions.map((dep) => (
                  <MenuItem key={dep} value={dep}>
                    {dep === 'all' ? 'All Departments' : dep}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>{t('courses.level')}</InputLabel>
              <Select
                value={levelFilter}
                label={t('courses.level')}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                {levels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level === 'all' ? t('courses.allLevels') : level.charAt(0).toUpperCase() + level.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Results count */}
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        {t('courses.results', { count: filteredCourses.length })}
      </Typography>

      {/* Course Grid */}
      <Grid container spacing={3}>
        {filteredCourses.map((course) => (
          <Grid item xs={12} sm={6} md={4} key={course.id}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  transition: 'transform 0.3s ease-in-out',
                  boxShadow: 3
                }
              }}
            >
              <CardMedia
                component="img"
                height="200"
                image={course.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiPjQwMHg0NTA8L3RleHQ+Cjwvc3ZnPg=='}
                alt={course.title}
              />
              
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip 
                      label={course.category} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    {course.department && (
                      <Chip 
                        label={course.department}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    )}
                    <Chip 
                      label={course.level} 
                      size="small" 
                      color="secondary" 
                      variant="outlined"
                    />
                  </Stack>
                  
                  <Typography variant="h6" component="h2" sx={{ mb: 1, fontWeight: 600 }}>
                    {course.title}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {course.description}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    {t('courses.instructor')}: {course.teacher?.firstName} {course.teacher?.lastName}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="textSecondary">
                      {formatDuration(getTotalDuration(course.Videos))}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="textSecondary">
                      {course.studentCount || 0}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    <Typography variant="body2" color="textSecondary">
                      {course.rating || 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Button
                    component={Link}
                    to={`/course/${course.id}`}
                    variant="contained"
                    size="small"
                    startIcon={<PlayIcon />}
                  >
                    {t('courses.viewCourse')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredCourses.length === 0 && (
        <Box textAlign="center" sx={{ py: 8 }}>
          <Typography variant="h6" color="textSecondary">
            {t('courses.emptyTitle')}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {t('courses.emptySubtitle')}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default CourseList;

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

const CourseList = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    // Only fetch courses when user is authenticated
    if (isAuthenticated && user) {
      fetchCourses();
    }
  }, [isAuthenticated, user]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);

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

  const categories = ['all', 'Programming', 'Design', 'Business', 'Marketing'];
  const levels = ['all', 'beginner', 'intermediate', 'advanced'];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    const matchesLevel = levelFilter === 'all' || course.level === levelFilter;
    
    return matchesSearch && matchesCategory && matchesLevel;
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
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 600 }}>
        Browse Courses
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select
                value={levelFilter}
                label="Level"
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                {levels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level === 'all' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Results count */}
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        {filteredCourses.length} courses found
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
                    Instructor: {course.teacher?.firstName} {course.teacher?.lastName}
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

                <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                    Free
                  </Typography>
                  
                  <Button
                    component={Link}
                    to={`/course/${course.id}`}
                    variant="contained"
                    size="small"
                    startIcon={<PlayIcon />}
                  >
                    View Course
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
            No courses found matching your criteria
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Try adjusting your search or filters
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default CourseList;

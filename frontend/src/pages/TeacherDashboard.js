import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  School as SchoolIcon,
  VideoLibrary as VideoIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  TrendingUp as TrendingIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch teacher's courses
  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses/teacher/my-courses');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setSnackbar({ open: true, message: 'Failed to fetch courses', severity: 'error' });
    }
  };

  // Fetch students enrolled in teacher's courses
  const fetchStudents = async () => {
    try {
      const response = await axios.get('/api/courses/teacher/students');
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setSnackbar({ open: true, message: 'Failed to fetch students', severity: 'error' });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCourses(), fetchStudents()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Delete course
  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    
    try {
      await axios.delete(`/api/courses/${courseToDelete.id}`);
      setSnackbar({ open: true, message: 'Course deleted successfully', severity: 'success' });
      fetchCourses();
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error('Error deleting course:', error);
      setSnackbar({ open: true, message: 'Failed to delete course', severity: 'error' });
    }
  };

  // Open delete dialog
  const openDeleteDialog = (course) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  // Close delete dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCourseToDelete(null);
  };

  // Calculate course statistics
  const getCourseStats = () => {
    const totalStudents = students.length;
    const totalVideos = courses.reduce((sum, course) => sum + (course.videos?.length || 0), 0);
    const publishedCourses = courses.filter(course => course.isPublished).length;
    const draftCourses = courses.filter(course => !course.isPublished).length;
    const totalChapters = courses.reduce((sum, course) => sum + (course.chapters?.length || 0), 0);

    return { totalStudents, totalVideos, publishedCourses, draftCourses, totalChapters };
  };

  const stats = getCourseStats();

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography variant="h6">Loading your dashboard...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            Welcome back, Teacher!
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage your courses and track student progress
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/create-course"
          variant="contained"
          startIcon={<AddIcon />}
          size="large"
        >
          Create New Course
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    My Courses
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {courses.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {stats.publishedCourses} published, {stats.draftCourses} draft
                  </Typography>
                </Box>
                <SchoolIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Course Sections
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.totalChapters}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Organized learning content
                  </Typography>
                </Box>
                <AssessmentIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Videos
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.totalVideos}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Learning materials
                  </Typography>
                </Box>
                <VideoIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Enrolled Students
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats.totalStudents}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active learners
                  </Typography>
                </Box>
                <GroupIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="My Courses" />
          <Tab label="Students" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                My Courses
              </Typography>
              <Button
                component={Link}
                to="/create-course"
                variant="outlined"
                startIcon={<AddIcon />}
                size="medium"
              >
                Add Course
              </Button>
            </Box>
            
            {courses.length === 0 ? (
              <Box textAlign="center" py={6}>
                <SchoolIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                <Typography variant="h5" color="textSecondary" gutterBottom>
                  No courses yet
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                  Create your first course to start teaching and sharing knowledge
                </Typography>
                <Button
                  component={Link}
                  to="/create-course"
                  variant="contained"
                  startIcon={<AddIcon />}
                  size="large"
                >
                  Create Your First Course
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Course</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Sections</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Videos</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Students</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                              {course.title}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                              {course.description?.substring(0, 80)}...
                            </Typography>
                            <Box display="flex" gap={1}>
                              <Chip label={course.category} size="small" color="primary" variant="outlined" />
                              <Chip label={course.level} size="small" color="secondary" variant="outlined" />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <AssessmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {course.sections?.length || 0} sections
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <VideoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {course.videos?.length || 0} videos
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {course.studentCount || 0} students
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={course.isPublished ? 'Published' : 'Draft'}
                            color={course.isPublished ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/course/${course.id}`)}
                              title="View Course"
                              color="primary"
                            >
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/edit-course/${course.id}`)}
                              title="Edit Course"
                              color="info"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openDeleteDialog(course)}
                              title="Delete Course"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Students in My Courses
            </Typography>
            
            {students.length === 0 ? (
              <Box textAlign="center" py={6}>
                <GroupIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
                <Typography variant="h5" color="textSecondary" gutterBottom>
                  No students yet
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Students will appear here once they enroll in your courses
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Enrolled Course</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Enrolled Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Progress</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {student.firstName} {student.lastName}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {student.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                            {student.courseTitle}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(student.enrolledAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={student.progress || 0}
                              sx={{ width: 80, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {student.progress || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/student-progress/${student.id}`)}
                            title="View Progress"
                            color="primary"
                          >
                            <TrendingIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Course Analytics
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Course Performance
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Most Popular Course
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {courses.length > 0 ? courses[0]?.title : 'No courses'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Student Engagement
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Average Progress
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {students.length > 0 
                          ? Math.round(students.reduce((sum, s) => sum + (s.progress || 0), 0) / students.length)
                          : 0}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Delete Course Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Delete Course</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{courseToDelete?.title}"? This action cannot be undone and will remove all associated content.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteCourse} color="error" variant="contained">
            Delete Course
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TeacherDashboard;

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
  Chip,
  Avatar,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Paper,
  Divider,
  Pagination,
  InputAdornment,
  DialogContentText
} from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  VideoLibrary as VideoIcon,
  TrendingUp as TrendingIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  ListAlt as LogsIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LdapSettings from '../components/admin/LdapSettings';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: authUser, token } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // User creation dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'student',
    sendEmail: true
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  // System Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsLevel, setLogsLevel] = useState('');
  const [logsStartDate, setLogsStartDate] = useState('');
  const [logsEndDate, setLogsEndDate] = useState('');

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, email: '', password: '' });

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const TaxonomyManager = ({ type }) => {
    const [items, setItems] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const list = async () => {
      setLoadingList(true);
      try {
        const resp = await axios.get(`/api/admin/${type}`);
        setItems(resp?.data?.data || []);
      } catch (e) {
        setSnackbar({ open: true, message: `Failed to load ${type}`, severity: 'error' });
      } finally {
        setLoadingList(false);
      }
    };
    useEffect(() => { list(); }, []);
    const create = async () => {
      const v = (name || '').trim();
      if (!v) return;
      setCreating(true);
      try {
        await axios.post(`/api/admin/${type}`, { name: v });
        setName('');
        list();
      } catch (e) {
        setSnackbar({ open: true, message: `Failed to create in ${type}`, severity: 'error' });
      } finally {
        setCreating(false);
      }
    };
    const remove = async (id) => {
      if (!window.confirm('Delete this item?')) return;
      try {
        await axios.delete(`/api/admin/${type}/${id}`);
        list();
      } catch (e) {
        setSnackbar({ open: true, message: `Failed to delete from ${type}`, severity: 'error' });
      }
    };
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField size="small" label={t('admin.taxonomy.name', 'Name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="contained" onClick={create} disabled={creating}>{creating ? t('admin.taxonomy.creating', 'Creating...') : t('admin.taxonomy.add', 'Add')}</Button>
          <Button variant="text" onClick={list} disabled={loadingList}>{loadingList ? t('admin.courses.refreshing', 'Refreshing...') : t('admin.courses.refresh', 'Refresh')}</Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.taxonomy.name', 'Name')}</TableCell>
                <TableCell>{t('admin.courses.table.actions', 'Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(it => (
                <TableRow key={it.id} hover>
                  <TableCell>{it.name}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => remove(it.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };
  // Ensure auth token is set before making requests
  useEffect(() => {
    const authToken = token || localStorage.getItem('token');
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    }
  }, [token]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      // Ensure token is set
      const authToken = token || localStorage.getItem('token');
      if (authToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await axios.get('/api/admin/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setSnackbar({ open: true, message: 'Failed to load statistics', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch users
  const fetchUsers = async (pageNum = 1, search = '') => {
    setUsersLoading(true);
    try {
      // Ensure token is set
      const authToken = token || localStorage.getItem('token');
      if (authToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await axios.get('/api/admin/users', {
        params: { page: pageNum, limit: 10, search }
      });
      setUsers(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching users:', error);
      setSnackbar({ open: true, message: 'Failed to load users', severity: 'error' });
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch data when token is available
    const authToken = token || localStorage.getItem('token');
    if (authToken && authUser) {
      fetchStats();
      fetchUsers();
    }
  }, [token, authUser]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 1) {
      fetchUsers();
    } else if (newValue === 2) {
      fetchCourses();
    } else if (newValue === 3) {
      fetchLogs();
    } else if (newValue === 4 || newValue === 5) {
      // Taxonomy tabs
    }
  };

  const fetchCourses = async (pageNum = 1) => {
    setCoursesLoading(true);
    try {
      const resp = await axios.get('/api/admin/courses', { params: { page: pageNum, limit: 50 } });
      setCourses(resp?.data?.data || []);
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to load courses', severity: 'error' });
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchLogs = async (pageNum = 1) => {
    setLogsLoading(true);
    try {
      // Ensure token is set
      const authToken = token || localStorage.getItem('token');
      if (authToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }

      const params = {
        page: pageNum,
        limit: 20,
        search: logsSearch,
        level: logsLevel,
        startDate: logsStartDate,
        endDate: logsEndDate
      };

      const response = await axios.get('/api/admin/logs', { params });
      setLogs(response.data.data.logs);
      setLogsTotalPages(response.data.data.pagination.totalPages);
      setLogsPage(pageNum);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setSnackbar({ open: true, message: 'Failed to load logs', severity: 'error' });
    } finally {
      setLogsLoading(false);
    }
  };

  const updateCourse = async (course, data) => {
    try {
      const resp = await axios.put(`/api/admin/courses/${course.id}`, data);
      const updated = resp?.data?.data;
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, ...updated } : c));
      setSnackbar({ open: true, message: 'Course updated', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to update course', severity: 'error' });
    }
  };

  const deleteCourse = (course) => {
    setCourseToDelete(course);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;

    try {
      // Ensure token is set
      const authToken = token || localStorage.getItem('token');
      if (authToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }

      await axios.delete(`/api/admin/courses/${courseToDelete.id}`);
      setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
      setSnackbar({ open: true, message: 'Course deleted', severity: 'success' });
    } catch (e) {
      console.error('Error deleting course:', e);
      setSnackbar({ open: true, message: e?.response?.data?.message || 'Failed to delete course', severity: 'error' });
    } finally {
      setDeleteConfirmOpen(false);
      setCourseToDelete(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.firstName || !newUser.lastName) {
      setSnackbar({ open: true, message: 'Please fill all required fields', severity: 'error' });
      return;
    }

    setCreateLoading(true);
    try {
      // Ensure token is set
      const authToken = token || localStorage.getItem('token');
      if (authToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await axios.post('/api/admin/users', newUser);

      // Always show password dialog if backend returned a temp password
      if (response.data?.data?.tempPassword) {
        setPasswordDialog({
          open: true,
          email: newUser.email,
          password: response.data.data.tempPassword
        });
      }

      setSnackbar({
        open: true,
        message: response.data.message || 'User created successfully',
        severity: response.data.data.emailSent ? 'success' : 'warning'
      });
      setCreateDialogOpen(false);
      setNewUser({ email: '', firstName: '', lastName: '', role: 'student', sendEmail: true });
      fetchUsers();
      if (tabValue === 0) fetchStats();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to create user',
        severity: 'error'
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!csvFile) {
      setSnackbar({ open: true, message: 'Please select a CSV file', severity: 'error' });
      return;
    }

    setBulkLoading(true);
    try {
      // Ensure token is set
      const authToken = token || localStorage.getItem('token');
      if (authToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }

      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('sendEmails', newUser.sendEmail);

      const response = await axios.post('/api/admin/users/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { created, failed, errors } = response.data.data;
      setSnackbar({
        open: true,
        message: `Bulk creation completed: ${created} created, ${failed} failed`,
        severity: failed > 0 ? 'warning' : 'success'
      });

      if (errors.length > 0) {
        console.error('Bulk creation errors:', errors);
      }

      setBulkDialogOpen(false);
      setCsvFile(null);
      fetchUsers();
      if (tabValue === 0) fetchStats();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to bulk create users',
        severity: 'error'
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      // Ensure token is set
      const authToken = token || localStorage.getItem('token');
      if (authToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }

      await axios.delete(`/api/admin/users/${userId}`);
      setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
      fetchUsers();
      if (tabValue === 0) fetchStats();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to delete user',
        severity: 'error'
      });
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() === '') {
      fetchUsers(1, '');
    } else {
      // Debounce search
      const timeoutId = setTimeout(() => {
        fetchUsers(1, query);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handlePageChange = (event, value) => {
    fetchUsers(value, searchQuery);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {t('admin.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            {t('admin.createUser')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setBulkDialogOpen(true)}
          >
            {t('admin.bulkUpload')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={t('admin.tabs.dashboard')} />
          <Tab label={t('admin.tabs.userManagement')} />
          <Tab label={t('admin.courses.title', 'Courses')} />
          <Tab label={t('admin.logs.title', 'System Logs')} />
          <Tab label={t('admin.taxonomy.categories', 'Categories')} />
          <Tab label={t('admin.taxonomy.departments', 'Departments')} />
          {authUser?.email === 'admin@viducate.local' && (
            <Tab label={t('admin.settings.title', 'System Settings')} />
          )}
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <>
          {/* Stats Cards */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : stats ? (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          {t('admin.stats.totalUsers')}
                        </Typography>
                        <Typography variant="h4" component="div">
                          {stats.totalUsers?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          {t('admin.stats.newUsersThisWeek', { count: stats.recentActivity?.newUsers || 0 })}
                        </Typography>
                      </Box>
                      <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          {t('admin.stats.totalCourses')}
                        </Typography>
                        <Typography variant="h4" component="div">
                          {stats.totalCourses || 0}
                        </Typography>
                      </Box>
                      <SchoolIcon sx={{ fontSize: 40, color: 'success.main' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          {t('admin.stats.totalVideos')}
                        </Typography>
                        <Typography variant="h4" component="div">
                          {stats.totalVideos?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                      <VideoIcon sx={{ fontSize: 40, color: 'info.main' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          {t('admin.stats.students')}
                        </Typography>
                        <Typography variant="h4" component="div">
                          {stats.totalStudents?.toLocaleString() || 0}
                        </Typography>
                      </Box>
                      <TrendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : null}
        </>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                {t('admin.tabs.userManagement')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder={t('admin.userManagement.searchPlaceholder')}
                  value={searchQuery}
                  onChange={handleSearch}
                  sx={{ width: 250 }}
                />
                <IconButton onClick={() => fetchUsers(page, searchQuery)}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>

            {usersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('admin.table.user')}</TableCell>
                        <TableCell>{t('admin.table.email')}</TableCell>
                        <TableCell>{t('admin.table.role')}</TableCell>
                        <TableCell>{t('admin.table.status')}</TableCell>
                        <TableCell>{t('admin.table.created')}</TableCell>
                        <TableCell>{t('admin.table.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography color="textSecondary">{t('admin.table.noUsersFound')}</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={2}>
                                <Avatar sx={{ width: 32, height: 32 }}>
                                  {user.firstName?.charAt(0) || 'U'}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {user.firstName} {user.lastName}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={user.role}
                                color={
                                  user.role === 'admin' ? 'error' :
                                    user.role === 'teacher' ? 'primary' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={user.isActive ? t('admin.table.active') : t('admin.table.inactive')}
                                color={user.isActive ? 'success' : 'error'}
                                size="small"
                              />
                              {user.isPasswordChangeRequired && (
                                <Chip
                                  label={t('admin.table.passwordRequired')}
                                  color="warning"
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.id === authUser?.id}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={handlePageChange}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                {t('admin.courses.title', 'Courses')}
              </Typography>
              <Button variant="text" size="small" onClick={() => fetchCourses()} disabled={coursesLoading}>
                {coursesLoading ? t('admin.courses.refreshing', 'Refreshing...') : t('admin.courses.refresh', 'Refresh')}
              </Button>
            </Box>
            {coursesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('admin.courses.table.title', 'Title')}</TableCell>
                      <TableCell>{t('admin.courses.table.teacher', 'Teacher')}</TableCell>
                      <TableCell>{t('admin.courses.table.category', 'Category')}</TableCell>
                      <TableCell>{t('admin.courses.table.department', 'Department')}</TableCell>
                      <TableCell>{t('admin.courses.table.permission', 'Publish Permission')}</TableCell>
                      <TableCell>{t('admin.courses.table.actions', 'Actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {courses.map(course => (
                      <TableRow key={course.id} hover>
                        <TableCell>{course.title}</TableCell>
                        <TableCell>{course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : '-'}</TableCell>
                        <TableCell>{course.category || '—'}</TableCell>
                        <TableCell>{course.department || '—'}</TableCell>
                        <TableCell>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={!!course.teacherPublishAllowed}
                                onChange={(e) => updateCourse(course, { teacherPublishAllowed: e.target.checked })}
                                color="primary"
                              />
                            }
                            label={course.teacherPublishAllowed ? t('admin.courses.permissionAllowed', 'Allowed') : t('admin.courses.permissionDenied', 'Not Allowed')}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="primary" onClick={() => navigate(`/course/${course.id}?adminPreview=1`)} title={t('admin.courses.preview', 'Preview')}>
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteCourse(course)}>
                            <DeleteIcon />
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

      {/* System Logs Tab */}
      <div role="tabpanel" hidden={tabValue !== 3}>
        {tabValue === 3 && (
          <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="log-level-label">Level</InputLabel>
                    <Select
                      labelId="log-level-label"
                      value={logsLevel}
                      label="Level"
                      onChange={(e) => setLogsLevel(e.target.value)}
                    >
                      <MenuItem value="">All Levels</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                      <MenuItem value="warn">Warning</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="debug">Debug</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search Logs"
                    value={logsSearch}
                    onChange={(e) => setLogsSearch(e.target.value)}
                    placeholder="Search message..."
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="contained"
                    onClick={() => fetchLogs(1)}
                    disabled={logsLoading}
                    startIcon={<RefreshIcon />}
                    fullWidth
                  >
                    Refresh
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Level</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Context</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        No logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Chip
                            label={log.level.toUpperCase()}
                            size="small"
                            color={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'default'}
                            variant={log.info ? 'outlined' : 'filled'}
                            sx={{ minWidth: 70 }}
                          />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 400, wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {log.message}
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                              <details>
                                <summary>Meta Data</summary>
                                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.meta, null, 2)}</pre>
                              </details>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{log.userId || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{log.context || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={logsTotalPages}
                page={logsPage}
                onChange={(e, v) => fetchLogs(v)}
                color="primary"
              />
            </Box>
          </Box>
        )}
      </div>

      <div role="tabpanel" hidden={tabValue !== 4}>
        {tabValue === 4 && <TaxonomyManager type="categories" />}
      </div>
      <div role="tabpanel" hidden={tabValue !== 5}>
        {tabValue === 5 && <TaxonomyManager type="departments" />}
      </div>
      <div role="tabpanel" hidden={tabValue !== 6}>
        {tabValue === 6 && authUser?.email === 'admin@viducate.local' && <LdapSettings />}
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.createDialog.title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('admin.createDialog.email')}
              type="email"
              fullWidth
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <TextField
              label={t('admin.createDialog.firstName')}
              fullWidth
              required
              value={newUser.firstName}
              onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
            />
            <TextField
              label={t('admin.createDialog.lastName')}
              fullWidth
              required
              value={newUser.lastName}
              onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>{t('admin.createDialog.role')}</InputLabel>
              <Select
                value={newUser.role}
                label={t('admin.createDialog.role')}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <MenuItem value="student">{t('admin.createDialog.student')}</MenuItem>
                <MenuItem value="teacher">{t('admin.createDialog.teacher')}</MenuItem>
                <MenuItem value="admin">{t('admin.createDialog.admin')}</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newUser.sendEmail}
                  onChange={(e) => setNewUser({ ...newUser, sendEmail: e.target.checked })}
                />
              }
              label={t('admin.createDialog.sendWelcome')}
            />
            {!newUser.sendEmail && (
              <Alert severity="info">
                {t('admin.createDialog.passwordInfo')}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>{t('admin.createDialog.cancel')}</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={createLoading}
          >
            {createLoading ? <CircularProgress size={24} /> : t('admin.createDialog.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.bulkDialog.title')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('admin.bulkDialog.csvInfo')}
            </Alert>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              style={{ marginBottom: 16 }}
            />
            {csvFile && (
              <Typography variant="body2" color="textSecondary">
                {t('admin.bulkDialog.selected', { name: csvFile.name })}
              </Typography>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={newUser.sendEmail}
                  onChange={(e) => setNewUser({ ...newUser, sendEmail: e.target.checked })}
                />
              }
              label={t('admin.bulkDialog.sendWelcomeAll')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>{t('admin.bulkDialog.cancel')}</Button>
          <Button
            onClick={handleBulkCreate}
            variant="contained"
            disabled={bulkLoading || !csvFile}
          >
            {bulkLoading ? <CircularProgress size={24} /> : t('admin.bulkDialog.uploadCreate')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Dialog - Shows password when email failed */}
      <Dialog open={passwordDialog.open} onClose={() => setPasswordDialog({ ...passwordDialog, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.passwordDialog.title')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {t('admin.passwordDialog.title')}
            </Typography>
            <Typography variant="body2">
              {/* Keep as-is: detailed environment note, not localized */}
              Resend test modunda aktif. Sadece kayıtlı email adresinize (utkcursor@gmail.com) gönderebilirsiniz.
              Diğer email adreslerine göndermek için domain doğrulaması yapmanız gerekiyor.
              <br />
              <strong>Şimdilik:</strong> Aşağıdaki şifreyi kopyalayıp kullanıcıya manuel olarak iletin.
            </Typography>
          </Alert>
          <Box sx={{ mt: 2 }}>
            <TextField
              label={t('admin.passwordDialog.email')}
              value={passwordDialog.email}
              fullWidth
              disabled
              sx={{ mb: 2 }}
            />
            <TextField
              label={t('admin.passwordDialog.password')}
              value={passwordDialog.password}
              fullWidth
              disabled
              type="text"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        navigator.clipboard.writeText(passwordDialog.password);
                        setSnackbar({ open: true, message: t('admin.passwordDialog.copied'), severity: 'success' });
                      }}
                    >
                      {t('admin.passwordDialog.copy')}
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog({ ...passwordDialog, open: false })}>
            {t('admin.passwordDialog.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          {t('admin.courses.deleteTitle', 'Delete Course')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {courseToDelete && t('admin.courses.deleteConfirm', { title: courseToDelete.title, defaultValue: `Are you sure you want to delete "${courseToDelete.title}"? This action cannot be undone.` })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
            {t('common.delete', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminDashboard;

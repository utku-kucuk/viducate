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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Paper,
  Divider,
  Pagination,
  InputAdornment
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
  Email as EmailIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = () => {
  const { user: authUser, token } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
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
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, email: '', password: '' });

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
    fetchStats();
    fetchUsers();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 1) {
      fetchUsers();
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
      
      // If email was not sent but password is returned, show password dialog
      if (!response.data.data.emailSent && response.data.data.tempPassword) {
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
          Admin Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create User
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setBulkDialogOpen(true)}
          >
            Bulk Upload
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Dashboard" />
          <Tab label="User Management" />
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
                          Total Users
                        </Typography>
                        <Typography variant="h4" component="div">
                          {stats.totalUsers?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          +{stats.recentActivity?.newUsers || 0} this week
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
                          Total Courses
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
                          Total Videos
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
                          Students
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
                User Management
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Search users..."
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
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography color="textSecondary">No users found</Typography>
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
                                label={user.isActive ? 'Active' : 'Inactive'} 
                                color={user.isActive ? 'success' : 'error'}
                                size="small"
                              />
                              {user.isPasswordChangeRequired && (
                                <Chip 
                                  label="Password Required" 
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

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            />
            <TextField
              label="First Name"
              fullWidth
              required
              value={newUser.firstName}
              onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
            />
            <TextField
              label="Last Name"
              fullWidth
              required
              value={newUser.lastName}
              onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                label="Role"
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={newUser.sendEmail}
                  onChange={(e) => setNewUser({ ...newUser, sendEmail: e.target.checked })}
                />
              }
              label="Send welcome email with credentials"
            />
            {!newUser.sendEmail && (
              <Alert severity="info">
                Password will be generated and returned in the response. Make sure to save it securely.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained" 
            disabled={createLoading}
          >
            {createLoading ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Create Users (CSV)</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              CSV format: email,firstName,lastName,role<br />
              Example: student@example.com,John,Doe,student
            </Alert>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              style={{ marginBottom: 16 }}
            />
            {csvFile && (
              <Typography variant="body2" color="textSecondary">
                Selected: {csvFile.name}
              </Typography>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={newUser.sendEmail}
                  onChange={(e) => setNewUser({ ...newUser, sendEmail: e.target.checked })}
                />
              }
              label="Send welcome emails to all users"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkCreate} 
            variant="contained" 
            disabled={bulkLoading || !csvFile}
          >
            {bulkLoading ? <CircularProgress size={24} /> : 'Upload & Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Dialog - Shows password when email failed */}
      <Dialog open={passwordDialog.open} onClose={() => setPasswordDialog({ ...passwordDialog, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>📧 Email Gönderilemedi - Kullanıcı Bilgileri</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Email gönderilemedi!
            </Typography>
            <Typography variant="body2">
              Resend test modunda aktif. Sadece kayıtlı email adresinize (utkcursor@gmail.com) gönderebilirsiniz. 
              Diğer email adreslerine göndermek için domain doğrulaması yapmanız gerekiyor.
              <br />
              <strong>Şimdilik:</strong> Aşağıdaki şifreyi kopyalayıp kullanıcıya manuel olarak iletin.
            </Typography>
          </Alert>
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Email"
              value={passwordDialog.email}
              fullWidth
              disabled
              sx={{ mb: 2 }}
            />
            <TextField
              label="Şifre"
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
                        setSnackbar({ open: true, message: 'Şifre kopyalandı!', severity: 'success' });
                      }}
                    >
                      Kopyala
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog({ ...passwordDialog, open: false })}>
            Kapat
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

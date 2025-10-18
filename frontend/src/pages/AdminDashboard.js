import React from 'react';
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
  Avatar
} from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  VideoLibrary as VideoIcon,
  TrendingUp as TrendingIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const AdminDashboard = () => {
  // Mock data - in real app, this would come from API
  const stats = {
    totalUsers: 15420,
    totalCourses: 856,
    totalVideos: 12450,
    totalRevenue: 125000,
    activeUsers: 8920,
    newUsersThisMonth: 1240
  };

  const recentUsers = [
    {
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      role: 'student',
      status: 'active',
      joinedDate: '2024-01-15'
    },
    {
      id: 2,
      name: 'Bob Smith',
      email: 'bob@example.com',
      role: 'teacher',
      status: 'active',
      joinedDate: '2024-01-14'
    },
    {
      id: 3,
      name: 'Carol Davis',
      email: 'carol@example.com',
      role: 'student',
      status: 'inactive',
      joinedDate: '2024-01-13'
    }
  ];

  const systemStats = [
    {
      label: 'Server Status',
      value: 'Healthy',
      color: 'success'
    },
    {
      label: 'Database',
      value: 'Connected',
      color: 'success'
    },
    {
      label: 'Storage Usage',
      value: '78%',
      color: 'warning'
    },
    {
      label: 'Active Sessions',
      value: '1,247',
      color: 'info'
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 600 }}>
        Admin Dashboard
      </Typography>

      {/* Stats Cards */}
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
                    {stats.totalUsers.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    +{stats.newUsersThisMonth} this month
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
                    {stats.totalCourses}
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
                    {stats.totalVideos.toLocaleString()}
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
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" component="div">
                    ${stats.totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <TrendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Recent Users */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  Recent Users
                </Typography>
                <Button variant="outlined" size="small">
                  View All Users
                </Button>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Joined Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {user.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {user.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role} 
                            color={user.role === 'teacher' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.status} 
                            color={user.status === 'active' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(user.joinedDate).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
                System Status
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {systemStats.map((stat, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      {stat.label}
                    </Typography>
                    <Chip 
                      label={stat.value} 
                      color={stat.color}
                      size="small"
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
                Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<PeopleIcon />}
                  fullWidth
                >
                  Manage Users
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SchoolIcon />}
                  fullWidth
                >
                  Manage Courses
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SecurityIcon />}
                  fullWidth
                >
                  Security Settings
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  fullWidth
                >
                  System Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;

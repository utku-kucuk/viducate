import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Container,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  School as SchoolIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Book as BookIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [dashboardMenuAnchor, setDashboardMenuAnchor] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleDashboardMenuOpen = (event) => {
    setDashboardMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchor(null);
    setDashboardMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleTeacherDashboardClick = () => {
    handleMenuClose();
    navigate('/teacher');
  };

  const handleMyLearningClick = () => {
    handleMenuClose();
    navigate('/dashboard');
  };

  const handleAdminDashboardClick = () => {
    handleMenuClose();
    navigate('/admin');
  };

  const handleStudentDashboardClick = () => {
    handleMenuClose();
    navigate('/dashboard');
  };

  const getDashboardButton = () => {
    if (user?.role === 'teacher') {
      return (
        <Button
          onClick={handleDashboardMenuOpen}
          color="inherit"
          startIcon={<DashboardIcon />}
          sx={{ textTransform: 'none' }}
        >
          Dashboards
        </Button>
      );
    } else if (user?.role === 'admin') {
      return (
        <Button
          onClick={handleAdminDashboardClick}
          color="inherit"
          startIcon={<AdminIcon />}
          sx={{ textTransform: 'none' }}
        >
          Admin Panel
        </Button>
      );
    } else {
      return (
        <Button
          onClick={handleStudentDashboardClick}
          color="inherit"
          startIcon={<DashboardIcon />}
          sx={{ textTransform: 'none' }}
        >
          Dashboard
        </Button>
      );
    }
  };

  return (
    <AppBar position="sticky" elevation={1}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo */}
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              mr: 3
            }}
          >
            <SchoolIcon sx={{ mr: 1, fontSize: 32 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                letterSpacing: '.1rem'
              }}
            >
              Viducate
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
              <Button
                component={Link}
                to="/courses"
                color="inherit"
                sx={{ textTransform: 'none' }}
              >
                Courses
              </Button>
              {isAuthenticated && (
                <>
                  {getDashboardButton()}
                  {user?.role === 'teacher' && (
                    <>
                      <Divider orientation="vertical" flexItem />
                      <Button
                        onClick={handleMyLearningClick}
                        color="inherit"
                        startIcon={<BookIcon />}
                        sx={{ textTransform: 'none' }}
                      >
                        My Learning
                      </Button>
                    </>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Auth Buttons / User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isAuthenticated ? (
              <>
                {/* Desktop User Menu */}
                {!isMobile && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                      {user?.firstName}
                    </Typography>
                    <IconButton
                      onClick={handleProfileMenuOpen}
                      sx={{ p: 0 }}
                    >
                      <Avatar
                        sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
                      >
                        {user?.firstName?.charAt(0)}
                      </Avatar>
                    </IconButton>
                  </Box>
                )}

                {/* Mobile Menu Button */}
                {isMobile && (
                  <IconButton
                    color="inherit"
                    onClick={handleMobileMenuOpen}
                  >
                    <MenuIcon />
                  </IconButton>
                )}

                {/* Desktop Profile Menu */}
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={handleProfileClick}>
                    <PersonIcon sx={{ mr: 1 }} />
                    Profile
                  </MenuItem>
                  {user?.role === 'teacher' && (
                    <>
                      <MenuItem onClick={handleTeacherDashboardClick}>
                        <SchoolIcon sx={{ mr: 1 }} />
                        Teacher Dashboard
                      </MenuItem>
                      <MenuItem onClick={handleMyLearningClick}>
                        <BookIcon sx={{ mr: 1 }} />
                        My Learning
                      </MenuItem>
                      <Divider />
                    </>
                  )}
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>

                {/* Mobile Menu */}
                <Menu
                  anchorEl={mobileMenuAnchor}
                  open={Boolean(mobileMenuAnchor)}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  {user?.role === 'teacher' && (
                    <>
                      <MenuItem onClick={handleTeacherDashboardClick}>
                        <SchoolIcon sx={{ mr: 1 }} />
                        Teacher Dashboard
                      </MenuItem>
                      <MenuItem onClick={handleMyLearningClick}>
                        <BookIcon sx={{ mr: 1 }} />
                        My Learning
                      </MenuItem>
                      <Divider />
                    </>
                  )}
                  <MenuItem component={Link} to="/courses" onClick={handleMenuClose}>
                    Courses
                  </MenuItem>
                  <MenuItem onClick={handleProfileClick}>
                    <PersonIcon sx={{ mr: 1 }} />
                    Profile
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>

                {/* Dashboard Sub-Menu for Teacher */}
                {user?.role === 'teacher' && (
                  <Menu
                    anchorEl={dashboardMenuAnchor}
                    open={Boolean(dashboardMenuAnchor)}
                    onClose={handleMenuClose}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    <MenuItem onClick={handleTeacherDashboardClick}>
                      <SchoolIcon sx={{ mr: 1 }} />
                      Teacher Dashboard
                    </MenuItem>
                    <MenuItem onClick={handleMyLearningClick}>
                      <BookIcon sx={{ mr: 1 }} />
                      My Learning
                    </MenuItem>
                  </Menu>
                )}
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  component={Link}
                  to="/login"
                  color="inherit"
                  sx={{ textTransform: 'none' }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/register"
                  variant="contained"
                  color="secondary"
                  sx={{ textTransform: 'none' }}
                >
                  Sign Up
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;

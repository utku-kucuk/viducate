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
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  Menu as MenuIcon,
  School as SchoolIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Book as BookIcon,
  LibraryBooks as LibraryBooksIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language?.startsWith('tr') ? 'tr' : 'en');
  useEffect(() => {
    setLang(i18n.language?.startsWith('tr') ? 'tr' : 'en');
  }, [i18n.language]);
  
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
          {t('nav.dashboards')}
        </Button>
      );
    } else if (user?.role === 'admin') {
      return (
        <Button
          onClick={handleDashboardMenuOpen}
          color="inherit"
          startIcon={<DashboardIcon />}
          sx={{ textTransform: 'none' }}
        >
            {t('nav.dashboards')}
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
          {t('nav.dashboard')}
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
              mr: 3,
              ml: 0
            }}
          >
            <Box
              component="img"
              src="/viducate-logo.png"
              alt="Viducate"
              sx={{
                height: 28,
                width: 'auto',
                mr: 1.2,
                display: 'block',
                mt: -1
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '.06rem' }}>
              {t('nav.brand')}
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, ml: 1 }}>
              {isAuthenticated && (
                <>
                  <Button
                    component={Link}
                    to="/courses"
                    color="inherit"
                    startIcon={<BookIcon />}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('nav.courses')}
                  </Button>
                  {getDashboardButton()}
                  <Button
                    component={Link}
                    to="/notes"
                    color="inherit"
                    startIcon={<NotesIcon />}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('nav.myNotes')}
                  </Button>
                  {user?.role === 'teacher' && (
                    <>
                      <Divider orientation="vertical" flexItem />
                      <Button
                        onClick={handleMyLearningClick}
                        color="inherit"
                        startIcon={<LibraryBooksIcon />}
                        sx={{ textTransform: 'none' }}
                      >
                        {t('nav.myLearning')}
                      </Button>
                    </>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Auth Buttons / User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Language Toggle */}
            <Box sx={{ mr: 1.5 }}>
              <ToggleButtonGroup
                value={lang}
                exclusive
                onChange={(_, value) => {
                  if (!value) return;
                  setLang(value);
                  i18n.changeLanguage(value);
                }}
                size="small"
                sx={{
                  bgcolor: 'grey.200',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 999,
                  p: 0,
                  overflow: 'hidden',
                  '& .MuiToggleButton-root': {
                    border: 0,
                    margin: 0,
                    textTransform: 'none',
                    px: 1.5,
                    minWidth: 44,
                    height: 30,
                    borderRadius: 0
                  },
                  '& .MuiToggleButton-root.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText'
                  },
                  '& .MuiToggleButton-root.Mui-selected:hover': {
                    bgcolor: 'primary.dark'
                  }
                }}
                aria-label="language toggle"
              >
                <ToggleButton
                  value="tr"
                  aria-label="Türkçe"
                  sx={{
                    textTransform: 'none',
                    px: 1.5,
                    minWidth: 44,
                    border: 0,
                    height: 30,
                    borderRadius: 0,
                    '&.MuiToggleButtonGroup-grouped': { margin: 0, border: 0 }
                  }}
                >
                  TR
                </ToggleButton>
                <ToggleButton
                  value="en"
                  aria-label="English"
                  sx={{
                    textTransform: 'none',
                    px: 1.5,
                    minWidth: 44,
                    border: 0,
                    height: 30,
                    borderRadius: 0,
                    '&.MuiToggleButtonGroup-grouped': { margin: 0, border: 0 }
                  }}
                >
                  EN
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
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
                    {t('nav.profile')}
                  </MenuItem>
                  {(user?.role === 'teacher' || user?.role === 'admin') && (
                    <>
                      {user?.role === 'admin' && (
                        <MenuItem onClick={handleAdminDashboardClick}>
                          <AdminIcon sx={{ mr: 1 }} />
                          {t('nav.adminPanel')}
                        </MenuItem>
                      )}
                      <MenuItem onClick={handleTeacherDashboardClick}>
                        <SchoolIcon sx={{ mr: 1 }} />
                        {t('nav.teacherDashboard')}
                      </MenuItem>
                      <MenuItem onClick={handleMyLearningClick}>
                        <LibraryBooksIcon sx={{ mr: 1 }} />
                        {t('nav.myLearning')}
                      </MenuItem>
                      <Divider />
                    </>
                  )}
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    {t('nav.logout')}
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
                  {(user?.role === 'teacher' || user?.role === 'admin') && (
                    <>
                      {user?.role === 'admin' && (
                        <MenuItem onClick={handleAdminDashboardClick}>
                          <AdminIcon sx={{ mr: 1 }} />
                          {t('nav.adminPanel')}
                        </MenuItem>
                      )}
                      <MenuItem onClick={handleTeacherDashboardClick}>
                        <SchoolIcon sx={{ mr: 1 }} />
                        {t('nav.teacherDashboard')}
                      </MenuItem>
                      <MenuItem onClick={handleMyLearningClick}>
                        <LibraryBooksIcon sx={{ mr: 1 }} />
                        {t('nav.myLearning')}
                      </MenuItem>
                      <Divider />
                    </>
                  )}
                {isAuthenticated && (
                  <MenuItem component={Link} to="/courses" onClick={handleMenuClose}>
                    <BookIcon sx={{ mr: 1 }} />
                    {t('nav.courses')}
                  </MenuItem>
                )}
                {isAuthenticated && (
                  <MenuItem component={Link} to="/notes" onClick={handleMenuClose}>
                    <NotesIcon sx={{ mr: 1 }} />
                    {t('nav.myNotes')}
                  </MenuItem>
                )}
                  <MenuItem onClick={handleProfileClick}>
                    <PersonIcon sx={{ mr: 1 }} />
                    {t('nav.profile')}
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    {t('nav.logout')}
                  </MenuItem>
                </Menu>

                {/* Dashboard Sub-Menu for Teacher/Admin */}
                {(user?.role === 'teacher' || user?.role === 'admin') && (
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
                    {user?.role === 'admin' && (
                      <MenuItem onClick={handleAdminDashboardClick}>
                        <AdminIcon sx={{ mr: 1 }} />
                        {t('nav.adminPanel')}
                      </MenuItem>
                    )}
                    <MenuItem onClick={handleTeacherDashboardClick}>
                      <SchoolIcon sx={{ mr: 1 }} />
                      {t('nav.teacherDashboard')}
                    </MenuItem>
                    <MenuItem onClick={handleMyLearningClick}>
                      <LibraryBooksIcon sx={{ mr: 1 }} />
                      {t('nav.myLearning')}
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
                  {t('nav.login')}
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

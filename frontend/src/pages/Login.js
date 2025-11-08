import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      // Check if password change is required
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (user.isPasswordChangeRequired) {
        // Show password change modal
        setShowPasswordChangeModal(true);
      } else {
        // Role-based redirect after successful login
        let redirectPath = from;
        
        if (user.role === 'teacher' || user.role === 'admin') {
          redirectPath = '/teacher';
        } else if (user.role === 'student') {
          redirectPath = '/dashboard';
        }
        
        navigate(redirectPath, { replace: true });
      }
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
            Welcome Back
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            Sign in to continue your learning journey
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mb: 3, py: 1.5 }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ width: '100%', my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>

          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Don't have an account?{' '}
              <Link component={RouterLink} to="/register" variant="body2">
                Sign up here
              </Link>
            </Typography>
            
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Forgot your password?
            </Link>
          </Box>
        </Paper>
      </Box>

      {/* Password Change Modal */}
      <Dialog 
        open={showPasswordChangeModal} 
        onClose={() => {}} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>Şifre Değiştirme Zorunlu</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            İlk girişinizde güvenliğiniz için şifrenizi değiştirmeniz gerekmektedir.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Mevcut Şifre"
              type="password"
              fullWidth
              value={passwordChangeData.currentPassword}
              onChange={(e) => {
                setPasswordChangeData(prev => ({ ...prev, currentPassword: e.target.value }));
                if (passwordErrors.currentPassword) {
                  setPasswordErrors(prev => ({ ...prev, currentPassword: '' }));
                }
              }}
              error={!!passwordErrors.currentPassword}
              helperText={passwordErrors.currentPassword}
            />
            <TextField
              label="Yeni Şifre"
              type="password"
              fullWidth
              value={passwordChangeData.newPassword}
              onChange={(e) => {
                setPasswordChangeData(prev => ({ ...prev, newPassword: e.target.value }));
                if (passwordErrors.newPassword) {
                  setPasswordErrors(prev => ({ ...prev, newPassword: '' }));
                }
              }}
              error={!!passwordErrors.newPassword}
              helperText={passwordErrors.newPassword || 'En az 6 karakter olmalıdır'}
            />
            <TextField
              label="Yeni Şifre (Tekrar)"
              type="password"
              fullWidth
              value={passwordChangeData.confirmPassword}
              onChange={(e) => {
                setPasswordChangeData(prev => ({ ...prev, confirmPassword: e.target.value }));
                if (passwordErrors.confirmPassword) {
                  setPasswordErrors(prev => ({ ...prev, confirmPassword: '' }));
                }
              }}
              error={!!passwordErrors.confirmPassword}
              helperText={passwordErrors.confirmPassword}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={async () => {
              // Validate
              const newErrors = {};
              
              if (!passwordChangeData.currentPassword) {
                newErrors.currentPassword = 'Mevcut şifre gereklidir';
              }
              
              if (!passwordChangeData.newPassword) {
                newErrors.newPassword = 'Yeni şifre gereklidir';
              } else if (passwordChangeData.newPassword.length < 6) {
                newErrors.newPassword = 'Şifre en az 6 karakter olmalıdır';
              }
              
              if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
                newErrors.confirmPassword = 'Şifreler eşleşmiyor';
              }
              
              if (Object.keys(newErrors).length > 0) {
                setPasswordErrors(newErrors);
                return;
              }
              
              // Change password
              setPasswordLoading(true);
              try {
                const token = localStorage.getItem('token');
                const response = await axios.post('/api/auth/change-password', {
                  currentPassword: passwordChangeData.currentPassword,
                  newPassword: passwordChangeData.newPassword
                }, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                // Update user in localStorage
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                user.isPasswordChangeRequired = false;
                localStorage.setItem('user', JSON.stringify(user));
                
                // Close modal and redirect
                setShowPasswordChangeModal(false);
                
                // Role-based redirect
                let redirectPath = from;
                if (user.role === 'teacher' || user.role === 'admin') {
                  redirectPath = '/teacher';
                } else if (user.role === 'student') {
                  redirectPath = '/dashboard';
                }
                
                navigate(redirectPath, { replace: true });
              } catch (error) {
                const errorMessage = error.response?.data?.error || 'Şifre değiştirme başarısız';
                if (errorMessage.includes('Current password')) {
                  setPasswordErrors({ currentPassword: 'Mevcut şifre yanlış' });
                } else {
                  setPasswordErrors({ newPassword: errorMessage });
                }
              } finally {
                setPasswordLoading(false);
              }
            }}
            variant="contained"
            disabled={passwordLoading}
          >
            {passwordLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Login;

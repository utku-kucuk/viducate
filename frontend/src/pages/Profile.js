import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Divider,
  Chip,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    profilePicture: user?.profilePicture || ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Profile picture upload state
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

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

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const result = await updateProfile(formData);
    setLoading(false);

    if (result.success) {
      setMessage('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(result.error || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      bio: user?.bio || '',
      profilePicture: user?.profilePicture || ''
    });
    setErrors({});
    setIsEditing(false);
  };

  const handlePasswordChange = async () => {
    // Validate
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Mevcut şifre gereklidir';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Yeni şifre gereklidir';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Şifre en az 6 karakter olmalıdır';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return;
    }
    
    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('Şifre başarıyla değiştirildi!');
      setTimeout(() => setMessage(''), 3000);
      
      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordErrors({});
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
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 600 }}>
        Profil Ayarları
      </Typography>

      {message && (
        <Alert 
          severity={message.includes('başarıyla') || message.includes('successfully') ? 'success' : 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Profil Bilgileri" icon={<EditIcon />} iconPosition="start" />
          <Tab label="Şifre Değiştir" icon={<LockIcon />} iconPosition="start" />
        </Tabs>
      </Card>

      {tabValue === 0 && (
      <Grid container spacing={4}>
        {/* Profile Info */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Personal Information
                </Typography>
                {!isEditing ? (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={user?.email || ''}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    multiline
                    rows={4}
                    disabled={!isEditing}
                    helperText="Tell us about yourself"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Profil Resmi
                    </Typography>
                    {!isEditing ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={user?.profilePicture || formData.profilePicture}
                          sx={{ width: 80, height: 80 }}
                        >
                          {user?.firstName?.charAt(0)}
                        </Avatar>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <input
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="profile-picture-upload"
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setProfilePictureFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setProfilePicturePreview(reader.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label htmlFor="profile-picture-upload">
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={<UploadIcon />}
                            disabled={uploadingPicture}
                          >
                            {uploadingPicture ? 'Yükleniyor...' : 'Resim Seç'}
                          </Button>
                        </label>
                        {(profilePicturePreview || formData.profilePicture) && (
                          <Box sx={{ mt: 1 }}>
                            <Avatar
                              src={profilePicturePreview || formData.profilePicture}
                              sx={{ width: 100, height: 100, mb: 1 }}
                            />
                            {profilePictureFile && (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={async () => {
                                  setUploadingPicture(true);
                                  try {
                                    const formData = new FormData();
                                    formData.append('profilePicture', profilePictureFile);
                                    
                                    const token = localStorage.getItem('token');
                                    const response = await axios.post('/api/auth/upload-profile-picture', formData, {
                                      headers: {
                                        'Content-Type': 'multipart/form-data',
                                        Authorization: `Bearer ${token}`
                                      }
                                    });
                                    
                                    setFormData(prev => ({ ...prev, profilePicture: response.data.data.url }));
                                    setProfilePicturePreview(null);
                                    setProfilePictureFile(null);
                                    setMessage('Profil resmi başarıyla yüklendi!');
                                    setTimeout(() => setMessage(''), 3000);
                                    
                                    // Update user in context
                                    const updatedUser = { ...user, profilePicture: response.data.data.url };
                                    localStorage.setItem('user', JSON.stringify(updatedUser));
                                    window.location.reload(); // Refresh to show new picture
                                  } catch (error) {
                                    setMessage('Profil resmi yüklenirken hata oluştu');
                                    setTimeout(() => setMessage(''), 3000);
                                  } finally {
                                    setUploadingPicture(false);
                                  }
                                }}
                                sx={{ mt: 1 }}
                              >
                                Yükle
                              </Button>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Preview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Profile Preview
              </Typography>
              
              <Box display="flex" flexDirection="column" alignItems="center" sx={{ mb: 3 }}>
                <Avatar
                  src={formData.profilePicture || user?.profilePicture}
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    mb: 2,
                    fontSize: '3rem'
                  }}
                >
                  {formData.firstName?.charAt(0) || user?.firstName?.charAt(0)}
                </Avatar>
                
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  {formData.firstName} {formData.lastName}
                </Typography>
                
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {user?.email}
                </Typography>
                
                <Chip 
                  label={user?.role} 
                  color={user?.role === 'teacher' ? 'primary' : 'default'}
                  sx={{ mb: 2 }}
                />
                
                {formData.bio && (
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    {formData.bio}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Account Information
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Account Type
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {user?.role === 'teacher' ? 'Instructor' : 'Student'}
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Member Since
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Email Verification
                  </Typography>
                  <Chip 
                    label={user?.isEmailVerified ? 'Verified' : 'Not Verified'} 
                    color={user?.isEmailVerified ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Şifre Değiştir
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Mevcut Şifre"
                type="password"
                fullWidth
                value={passwordData.currentPassword}
                onChange={(e) => {
                  setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
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
                value={passwordData.newPassword}
                onChange={(e) => {
                  setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
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
                value={passwordData.confirmPassword}
                onChange={(e) => {
                  setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                error={!!passwordErrors.confirmPassword}
                helperText={passwordErrors.confirmPassword}
              />
              <Button
                variant="contained"
                onClick={handlePasswordChange}
                disabled={passwordLoading}
                sx={{ alignSelf: 'flex-start' }}
              >
                {passwordLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default Profile;

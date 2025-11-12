import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  AccessTime as TimeIcon,
  VideoLibrary as VideoIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If admin lands on home, redirect to admin panel by default
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);
  const { t } = useTranslation();

  const features = [
    {
      icon: <VideoIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: t('home.f1Title'),
      description: t('home.f1Desc')
    },
    {
      icon: <TrendingIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: t('home.f2Title'),
      description: t('home.f2Desc')
    },
    {
      icon: <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: t('home.f3Title'),
      description: t('home.f3Desc')
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: t('home.f4Title'),
      description: t('home.f4Desc')
    }
  ];

  const howItWorks = [
    {
      step: '1',
      title: t('home.step1Title'),
      description: t('home.step1Desc')
    },
    {
      step: '2',
      title: t('home.step2Title'),
      description: t('home.step2Desc')
    },
    {
      step: '3',
      title: t('home.step3Title'),
      description: t('home.step3Desc')
    }
  ];

  return (
    <Box>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 10,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 2,
                fontSize: { xs: '2.5rem', md: '3.2rem' }
              }}
            >
              {t('home.title')}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                mb: 4,
                opacity: 0.95,
                fontWeight: 300,
                maxWidth: 800,
                mx: 'auto'
              }}
            >
              {t('home.subtitle')}
            </Typography>

            {user ? (
              <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                <Button
                  component={Link}
                  to="/dashboard"
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  {t('home.goToDashboard')}
                </Button>
                <Button
                  component={Link}
                  to="/courses"
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  {t('home.viewCourses')}
                </Button>
              </Stack>
            ) : (
              <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                <Button
                  component={Link}
                  to="/login"
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  {t('home.signIn')}
                </Button>
              </Stack>
            )}
          </Box>
        </Container>
      </Box>

      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            textAlign="center"
            sx={{ mb: 6, fontWeight: 600 }}
          >
            {t('home.howItWorks')}
          </Typography>
          <Grid container spacing={4}>
            {howItWorks.map((step, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                    p: 3,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      transition: 'transform 0.3s ease-in-out',
                      boxShadow: 3
                    }
                  }}
                >
                  <CardContent>
                    <Chip
                      label={step.step}
                      color="primary"
                      sx={{ 
                        width: 50, 
                        height: 50, 
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        mb: 2
                      }}
                    />
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ mb: 2, fontWeight: 600 }}
                    >
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {step.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          textAlign="center"
          sx={{ mb: 6, fontWeight: 600 }}
        >
          {t('home.featuresTitle')}
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  p: 3,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.3s ease-in-out',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ mb: 2, fontWeight: 600 }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography
          variant="h3"
          component="h2"
          sx={{ mb: 3, fontWeight: 600 }}
        >
          {t('home.ctaTitle')}
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          {t('home.ctaSubtitle')}
        </Typography>
        {user ? (
          <Button
            component={Link}
            to="/dashboard"
            variant="contained"
            size="large"
            startIcon={<CheckIcon />}
            sx={{ px: 4, py: 1.5 }}
          >
            {t('home.ctaDashboard')}
          </Button>
        ) : null}
      </Container>
    </Box>
  );
};

export default Home;

import React from 'react';
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
  Paper
} from '@mui/material';
import {
  PlayCircle as PlayIcon,
  School as SchoolIcon,
  TrendingUp as TrendingIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  AccessTime as TimeIcon,
  VideoLibrary as VideoIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <VideoIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Video Takip Sistemi',
      description: 'Gelişmiş algoritma ile video izleme ilerlemenizi otomatik olarak takip eder'
    },
    {
      icon: <TrendingIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Gerçek Zamanlı İlerleme',
      description: 'Video izleme sürenizi ve tamamlanma yüzdenizi anlık olarak görün'
    },
    {
      icon: <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Öğretmen Paneli',
      description: 'Öğretmenler kurs oluşturabilir, video yükleyebilir ve öğrenci ilerlemesini takip edebilir'
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Güvenli Platform',
      description: 'JWT tabanlı kimlik doğrulama ile güvenli erişim ve veri koruması'
    }
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Kayıt Olun',
      description: 'Öğrenci veya öğretmen olarak hesap oluşturun'
    },
    {
      step: '2',
      title: 'Kurslara Erişin',
      description: 'Mevcut kursları görüntüleyin ve video içeriklerine erişin'
    },
    {
      step: '3',
      title: 'Video İzleyin',
      description: 'Videoları izleyin, sistem otomatik olarak ilerlemenizi kaydeder'
    },
    {
      step: '4',
      title: 'İlerlemenizi Takip Edin',
      description: 'Dashboard\'da tamamladığınız videoları ve genel ilerlemenizi görün'
    }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 8,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem' }
                }}
              >
                Viducate
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  opacity: 0.9,
                  fontWeight: 300
                }}
              >
                Akıllı video takip sistemi ile eğitim platformu. 
                Öğrencilerin video izleme ilerlemesini otomatik olarak takip eder.
              </Typography>
              
              {user ? (
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button
                    component={Link}
                    to="/dashboard"
                    variant="contained"
                    size="large"
                    sx={{
                      bgcolor: 'white',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'grey.100'
                      }
                    }}
                  >
                    Dashboard'a Git
                  </Button>
                  <Button
                    component={Link}
                    to="/courses"
                    variant="outlined"
                    size="large"
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Kursları Görüntüle
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button
                    component={Link}
                    to="/register"
                    variant="contained"
                    size="large"
                    sx={{
                      bgcolor: 'white',
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: 'grey.100'
                      }
                    }}
                  >
                    Üye Ol
                  </Button>
                  <Button
                    component={Link}
                    to="/login"
                    variant="outlined"
                    size="large"
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Giriş Yap
                  </Button>
                </Stack>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 400
                }}
              >
                <VideoIcon sx={{ fontSize: 200, opacity: 0.3 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Demo Video Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography
          variant="h3"
          component="h2"
          textAlign="center"
          sx={{ mb: 4, fontWeight: 600 }}
        >
          Sistem Nasıl Çalışır?
        </Typography>
        <Paper
          sx={{
            p: 3,
            textAlign: 'center',
            bgcolor: 'grey.50',
            border: '2px dashed',
            borderColor: 'primary.main'
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Demo Video
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Sistem tanıtım videosu buraya eklenecek
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            size="large"
          >
            Demo Video İzle
          </Button>
        </Paper>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            textAlign="center"
            sx={{ mb: 6, fontWeight: 600 }}
          >
            Nasıl Çalışır?
          </Typography>
          <Grid container spacing={4}>
            {howItWorks.map((step, index) => (
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

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          textAlign="center"
          sx={{ mb: 6, fontWeight: 600 }}
        >
          Özellikler
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

      {/* Video Tracking Algorithm Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h3"
                component="h2"
                sx={{ mb: 3, fontWeight: 600 }}
              >
                Akıllı Video Takip Algoritması
              </Typography>
              <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
                Sistem, video izleme davranışlarınızı analiz ederek:
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                  İzleme süresini ve yüzdesini takip eder
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                  %80 izlendiğinde videoyu tamamlandı sayar
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                  Duraklama, geri sarma gibi etkileşimleri kaydeder
                </Typography>
                <Typography component="li" variant="body1" sx={{ mb: 1 }}>
                  Oturum sürekliliğini kontrol eder
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 300
                }}
              >
                <TrendingIcon sx={{ fontSize: 150, opacity: 0.3 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography
          variant="h3"
          component="h2"
          sx={{ mb: 3, fontWeight: 600 }}
        >
          Hemen Başlayın
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Video takip sistemimizi deneyin ve eğitim sürecinizi optimize edin
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
            Dashboard'a Git
          </Button>
        ) : (
          <Button
            component={Link}
            to="/register"
            variant="contained"
            size="large"
            startIcon={<TimeIcon />}
            sx={{ px: 4, py: 1.5 }}
          >
            Ücretsiz Üye Ol
          </Button>
        )}
      </Container>
    </Box>
  );
};

export default Home;

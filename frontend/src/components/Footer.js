import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  YouTube as YouTubeIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { IS_DEMO } from '../demo';

const Footer = () => {
  const { t } = useTranslation();
  // The marketing links below point to pages that don't exist in the static demo
  if (IS_DEMO) {
    return (
      <Box component="footer" sx={{ bgcolor: 'grey.900', color: 'grey.400', py: 3, mt: 'auto' }}>
        <Container maxWidth="lg" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'white' }}>
            <SchoolIcon fontSize="small" />
            <Typography variant="body2" fontWeight={600}>Viducate</Typography>
            <Typography variant="body2" sx={{ color: 'grey.400' }}>· live demo</Typography>
          </Box>
          <Typography variant="body2">
            Built by{' '}
            <Link href="https://utkukucuk.com" color="inherit" target="_blank" rel="noopener">Utku Küçük</Link>
            {' · '}
            <Link href="https://github.com/utku-kucuk/viducate" color="inherit" target="_blank" rel="noopener">Source on GitHub</Link>
          </Typography>
        </Container>
      </Box>
    );
  }
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'grey.900',
        color: 'white',
        py: 6,
        mt: 'auto'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Company Info */}
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
              <SchoolIcon sx={{ mr: 1, fontSize: 32 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Viducate
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
              {t('footer.tagline')}
            </Typography>
            <Box display="flex" gap={1}>
              <IconButton sx={{ color: 'white' }}>
                <FacebookIcon />
              </IconButton>
              <IconButton sx={{ color: 'white' }}>
                <TwitterIcon />
              </IconButton>
              <IconButton sx={{ color: 'white' }}>
                <LinkedInIcon />
              </IconButton>
              <IconButton sx={{ color: 'white' }}>
                <YouTubeIcon />
              </IconButton>
            </Box>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              {t('footer.platform')}
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Link href="/courses" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.browseCourses')}
              </Link>
              <Link href="/about" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.about')}
              </Link>
              <Link href="/contact" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.contact')}
              </Link>
              <Link href="/blog" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.blog')}
              </Link>
            </Box>
          </Grid>

          {/* Support */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              {t('footer.support')}
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Link href="/help" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.helpCenter')}
              </Link>
              <Link href="/faq" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.faq')}
              </Link>
              <Link href="/support" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.contactSupport')}
              </Link>
              <Link href="/community" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.community')}
              </Link>
            </Box>
          </Grid>

          {/* For Instructors */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              {t('footer.forInstructors')}
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Link href="/teach" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.startTeaching')}
              </Link>
              <Link href="/instructor-guidelines" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.guidelines')}
              </Link>
              <Link href="/instructor-resources" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.resources')}
              </Link>
              <Link href="/instructor-community" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.community')}
              </Link>
            </Box>
          </Grid>

          {/* Legal */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              {t('footer.legal')}
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Link href="/privacy" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.privacy')}
              </Link>
              <Link href="/terms" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.terms')}
              </Link>
              <Link href="/cookies" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.cookies')}
              </Link>
              <Link href="/accessibility" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                {t('footer.accessibility')}
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'grey.700' }} />

        {/* Bottom Footer */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {t('footer.copyright')}
          </Typography>
          
          <Box display="flex" gap={3}>
            <Link href="/sitemap" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
              {t('footer.sitemap')}
            </Link>
            <Link href="/status" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
              {t('footer.systemStatus')}
            </Link>
            <Link href="/careers" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
              {t('footer.careers')}
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

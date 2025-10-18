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

const Footer = () => {
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
              Empowering learners worldwide with high-quality video education. 
              Join millions of students and instructors on our global learning platform.
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
              Platform
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Link href="/courses" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Browse Courses
              </Link>
              <Link href="/about" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                About Us
              </Link>
              <Link href="/contact" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Contact
              </Link>
              <Link href="/blog" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Blog
              </Link>
            </Box>
          </Grid>

          {/* Support */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Support
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Link href="/help" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Help Center
              </Link>
              <Link href="/faq" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                FAQ
              </Link>
              <Link href="/support" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Contact Support
              </Link>
              <Link href="/community" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Community
              </Link>
            </Box>
          </Grid>

          {/* For Instructors */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              For Instructors
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Link href="/teach" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Start Teaching
              </Link>
              <Link href="/instructor-guidelines" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Guidelines
              </Link>
              <Link href="/instructor-resources" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Resources
              </Link>
              <Link href="/instructor-community" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Community
              </Link>
            </Box>
          </Grid>

          {/* Legal */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Legal
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Link href="/privacy" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Privacy Policy
              </Link>
              <Link href="/terms" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Terms of Service
              </Link>
              <Link href="/cookies" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Cookie Policy
              </Link>
              <Link href="/accessibility" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                Accessibility
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'grey.700' }} />

        {/* Bottom Footer */}
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            © 2024 Viducate. All rights reserved.
          </Typography>
          
          <Box display="flex" gap={3}>
            <Link href="/sitemap" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
              Sitemap
            </Link>
            <Link href="/status" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
              System Status
            </Link>
            <Link href="/careers" color="inherit" sx={{ textDecoration: 'none', opacity: 0.8, '&:hover': { opacity: 1 } }}>
              Careers
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { IS_DEMO } from './index';

export default function DemoBanner() {
  if (!IS_DEMO) return null;
  const reset = () => {
    const { resetDemo } = require('./db');
    resetDemo();
    window.location.assign(`${process.env.PUBLIC_URL || ''}/login`);
  };
  return (
    <Box
      sx={{
        bgcolor: '#111827',
        color: '#e5e7eb',
        px: 2,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        flexWrap: 'wrap',
        fontSize: 13,
      }}
    >
      <Typography variant="body2" sx={{ fontSize: 13 }}>
        <strong>Live demo</strong> — runs entirely in your browser with sample data. Uploads are simulated and nothing leaves your device.
      </Typography>
      <Button size="small" onClick={reset} sx={{ color: '#a5b4fc', minWidth: 0, p: 0.25 }}>
        Reset demo
      </Button>
      <Button
        size="small"
        href="https://github.com/utku-kucuk/viducate"
        target="_blank"
        rel="noopener"
        sx={{ color: '#a5b4fc', minWidth: 0, p: 0.25 }}
      >
        Source on GitHub
      </Button>
    </Box>
  );
}

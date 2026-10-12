import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { IS_DEMO } from './index';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './seed';

export default function DemoAccounts({ onPick }) {
  if (!IS_DEMO) return null;
  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 3, width: '100%', bgcolor: '#f8fafc' }}>
      <Typography variant="subtitle2" gutterBottom>
        Demo accounts — click one to fill the form
      </Typography>
      <Stack spacing={1}>
        {DEMO_ACCOUNTS.map((a) => (
          <Box
            key={a.email}
            component="button"
            type="button"
            onClick={() => onPick(a.email, DEMO_PASSWORD)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              width: '100%',
              p: 1.25,
              border: '1px solid #e2e8f0',
              borderRadius: 1,
              bgcolor: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              font: 'inherit',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={600}>{a.email}</Typography>
              <Typography variant="caption" color="text.secondary">{a.name}</Typography>
            </Box>
            <Chip label={a.role} size="small" color={a.role === 'admin' ? 'secondary' : a.role === 'teacher' ? 'primary' : 'default'} />
          </Box>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Password for all accounts: <strong>{DEMO_PASSWORD}</strong>. Demo accounts are protected and can't be deleted or changed.
      </Typography>
    </Paper>
  );
}

import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, TextField, InputAdornment, Chip, Button, Divider, Snackbar, Alert } from '@mui/material';
import { Search, Add } from '@mui/icons-material';
import axios from 'axios';

const truncate = (text, max = 160) => {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
};

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [standaloneNotes, setStandaloneNotes] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const resp = await axios.get('/api/progress/user');
        const progress = resp?.data?.progress || [];
        const items = progress
          .filter(p => (p?.notes && p.notes.trim().length > 0) && p?.video)
          .map(p => ({
            id: p.id,
            videoId: p.video?.id,
            courseId: p.video?.courseId,
            courseTitle: p.video?.course?.title,
            videoTitle: p.video?.title,
            notes: p.notes,
            updatedAt: p.updatedAt || p.lastWatchedAt,
          }));
        setNotes(items);
        const sNotesResp = await axios.get('/api/notes');
        setStandaloneNotes(sNotesResp?.data?.notes || []);
      } catch (e) {
        console.error('Failed to load notes', e);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const filtered = notes.filter(n => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (n.notes || '').toLowerCase().includes(q) ||
      (n.videoTitle || '').toLowerCase().includes(q)
    );
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h1">My Notes</Typography>
        <Button startIcon={<Add />} variant="contained" onClick={() => setCreating(v => !v)}>
          {creating ? 'Close' : 'New Note'}
        </Button>
      </Box>

      {creating && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Create Note</Typography>
          <TextField
            label="Title"
            fullWidth
            value={createTitle}
            onChange={e => setCreateTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description (optional)"
            fullWidth
            multiline
            minRows={2}
            value={createDesc}
            onChange={e => setCreateDesc(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Content"
            fullWidth
            multiline
            minRows={4}
            value={createContent}
            onChange={e => setCreateContent(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={async () => {
              try {
                const payload = { title: createTitle.trim(), description: createDesc.trim() || undefined, content: createContent.trim() };
                if (!payload.title || !payload.content) {
                  setToast({ open: true, message: 'Title and Content are required', severity: 'warning' });
                  return;
                }
                const resp = await axios.post('/api/notes', payload);
                setStandaloneNotes(prev => [resp.data.note, ...prev]);
                setCreateTitle('');
                setCreateDesc('');
                setCreateContent('');
                setCreating(false);
                setToast({ open: true, message: 'Note created', severity: 'success' });
              } catch (e) {
                console.error('Create note failed', e);
                setToast({ open: true, message: 'Failed to create note', severity: 'error' });
              }
            }}
          >
            Save Note
          </Button>
        </Paper>
      )}

      <TextField
        fullWidth
        placeholder="Search notes..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          )
        }}
        sx={{ mb: 3 }}
      />

      {loading ? (
        <Typography>Loading...</Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography>No notes yet.</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {standaloneNotes.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mt: 2 }}>Personal Notes</Typography>
              {standaloneNotes.map(n => (
                <Paper key={n.id} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">{n.title}</Typography>
                    <Chip size="small" label={n.updatedAt ? new Date(n.updatedAt).toLocaleString() : '—'} />
                  </Box>
                  {n.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {n.description}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {truncate(n.content, 600)}
                  </Typography>
                </Paper>
              ))}
            </>
          )}
          <Typography variant="h6" sx={{ mt: 2 }}>Video Notes</Typography>
          {filtered.map(item => (
            <Paper key={item.id} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ mr: 2 }}>{item.videoTitle}</Typography>
                  {!!item.courseTitle && (
                    <Typography variant="body2" color="textSecondary">Course: {item.courseTitle}</Typography>
                  )}
                </Box>
                <Chip size="small" label={item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'} />
              </Box>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {truncate(item.notes, 400)}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Notes;

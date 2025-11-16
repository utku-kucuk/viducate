import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  TextField,
  Chip,
  Snackbar,
  Alert as MuiAlert
} from '@mui/material';
import { ArrowBack, SkipNext as NextIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
import axios from 'axios';
import CourseSidebar from '../components/CourseSidebar';
import { useTranslation } from 'react-i18next';

const FileViewer = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const adminPreview = new URLSearchParams(location.search).get('adminPreview') === '1';

  const [fileData, setFileData] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [nextItem, setNextItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [lastNotesSavedAt, setLastNotesSavedAt] = useState(null);
  const [isEditingNotes, setIsEditingNotes] = useState(true);
  const [autoSaveNotes, setAutoSaveNotes] = useState(true);
  const [notesSavedOpen, setNotesSavedOpen] = useState(false);

  const resolveUrl = (url) => {
    if (!url) return url;
    if (/^https?:/i.test(url) || url.startsWith('data:')) return url;
    const base = process.env.REACT_APP_API_BASE_URL ||
      (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:5001' : `${window.location.origin}`);
    try {
      return new URL(url, base).toString();
    } catch {
      return `${base.replace(/\/$/, '')}/${String(url).replace(/^\//, '')}`;
    }
  };

  const getOrderedItems = (course) => {
    const list = [];
    if (!course) return list;
    if (Array.isArray(course.chapters) && course.chapters.length > 0) {
      course.chapters.forEach(ch => ch.sections?.forEach(sec => sec.videos?.forEach(v => list.push(v))));
    }
    if (list.length === 0 && Array.isArray(course.videos)) {
      list.push(...course.videos);
    }
    list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    return list;
  };

  const computeNextItem = (course, currentId, currentMeta) => {
    const items = getOrderedItems(course);
    if (items.length === 0) return null;
    let idx = items.findIndex(v => String(v.id) === String(currentId));
    if (idx === -1 && currentMeta?.fileUrl) {
      const fn = String(currentMeta.fileUrl).split('/').pop();
      idx = items.findIndex(v => String(v?.fileUrl || '').split('/').pop() === fn);
    }
    if (idx === -1 && currentMeta?.title) {
      const t = String(currentMeta.title).trim().toLowerCase();
      idx = items.findIndex(v => String(v?.title || '').trim().toLowerCase() === t);
    }
    if (idx !== -1 && idx < items.length - 1) return items[idx + 1];
    const firstDifferent = items.find(v => String(v.id) !== String(currentId));
    return firstDifferent || null;
  };

  const detectViewerUrl = (fileUrl) => {
    const absUrl = resolveUrl(fileUrl);
    if (!absUrl) return null;
    const lower = absUrl.toLowerCase();
    if (lower.endsWith('.pdf')) {
      return absUrl + '#toolbar=1&navpanes=1';
    }
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absUrl)}`;
    }
    return absUrl;
  };

  const fetchCourseData = async (courseId) => {
    try {
      const url = adminPreview ? `/api/courses/${courseId}?adminPreview=1` : `/api/courses/${courseId}`;
      const resp = await axios.get(url);
      const course = resp?.data?.data;
      setCourseData(course);
    } catch (e) {
      // ignore
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Reset notes when switching content
      setNotes('');
      setLastNotesSavedAt(null);
      setIsEditingNotes(true);
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const resp = await axios.get(`/api/videos/${videoId}`);
      const vd = resp?.data?.data;
      setFileData(vd);
      // Load existing notes for students
      try {
        const pgResp = await axios.get(`/api/progress/video/${videoId}`);
        const progress = pgResp?.data?.progress || null;
        if (progress?.notes) setNotes(progress.notes);
      } catch (_) {}
      if (vd?.courseId) {
        await fetchCourseData(vd.courseId);
      }
    } catch (err) {
      setError('Failed to load file.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [videoId]);

  const markCompletedAndNext = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      // Mark as completed without conditions
      await axios.put(`/api/progress/video/${videoId}`, {
        watchDuration: 1,
        totalDuration: 1,
        watchPercentage: 100,
        watchedSegments: [{ start: 0, end: 1 }]
      });
    } catch {
      // ignore errors; still proceed
    } finally {
      // Compute next locally to avoid relying on async state
      const target = nextItem || computeNextItem(courseData, videoId, fileData);
      if (target) {
        // Resolve real id using courseData.videos
        let realId = null;
        const list = Array.isArray(courseData?.videos) ? courseData.videos : [];
        if (list.length > 0) {
          const norm = (s) => String(s || '').trim().toLowerCase();
          const tTitle = norm(target.title);
          const tFile = String(target.fileUrl || '').split('/').pop();
          // exact id match
          let found = list.find(v => String(v.id) === String(target.id));
          if (!found && tTitle) found = list.find(v => norm(v.title) === tTitle);
          if (!found && tFile) {
            found = list.find(v => String(v?.fileUrl || '').split('/').pop() === tFile);
          }
          if (!found && typeof target.order === 'number') {
            found = list.find(v => Number(v.order) === Number(target.order));
          }
          if (found) realId = found.id;
        }
        // If still null, and target.id looks like a UUID, trust it
        if (!realId && /^[0-9a-fA-F-]{36}$/.test(String(target.id || ''))) {
          realId = target.id;
        }
        if (realId) {
          const isFile = target?.type === 'file' || (/(\.pdf|\/uploads\/files\/)/i.test(String(target?.fileUrl || '')));
          navigate(`${isFile ? '/file/' : '/video/'}${realId}${adminPreview ? '?adminPreview=1' : ''}`);
          return;
        }
      }
      // Last resort: go back to course
      if (fileData?.courseId) navigate(`/course/${fileData.courseId}${adminPreview ? '?adminPreview=1' : ''}`);
    }
  };
  const saveNotes = async () => {
    try {
      setSavingNotes(true);
      await axios.put(`/api/progress/video/${videoId}/notes`, { notes });
      setLastNotesSavedAt(new Date());
      setNotesSavedOpen(true);
    } catch (_) {
      // ignore
    } finally {
      setSavingNotes(false);
    }
  };

  // Auto-save notes with debounce
  useEffect(() => {
    if (!autoSaveNotes || !fileData) return;
    const timer = setTimeout(() => {
      if (notes !== undefined) {
        saveNotes();
      }
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, autoSaveNotes, fileData]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !fileData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {error ? <Alert severity="error">{error}</Alert> : <Alert severity="error">File not found</Alert>}
        <Button startIcon={<ArrowBack />} sx={{ mt: 2 }} onClick={() => navigate(-1)}>Back</Button>
      </Container>
    );
  }

  const viewerUrl = detectViewerUrl(fileData.fileUrl);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CourseSidebar
        courseData={courseData}
        currentVideoId={videoId}
        refreshKey={videoId}
        readonly={false}
        onVideoSelect={(video) => {
          const isFile = video?.type === 'file' || (/(\.pdf|\/uploads\/files\/)/i.test(String(video?.fileUrl || '')));
          navigate(isFile ? `/file/${video.id}` : `/video/${video.id}`);
        }}
      />
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Box sx={{ mb: 2 }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
              Back
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileIcon color="action" />
              <Typography variant="h4">{fileData.title}</Typography>
            </Box>
            {fileData.description && (
              <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                {fileData.description}
              </Typography>
            )}
          </Box>

          <Box sx={{ mb: 3 }}>
            {viewerUrl ? (
              <>
                <iframe
                  title={fileData.title}
                  src={viewerUrl}
                  style={{ width: '100%', height: '75vh', border: '1px solid #ddd', borderRadius: 8 }}
                />
              </>
            ) : (
              <Alert severity="warning">Önizleme kullanılamıyor. Dosyayı aç: <a href={resolveUrl(fileData.fileUrl)} target="_blank" rel="noreferrer">Yeni sekmede aç</a></Alert>
            )}
          </Box>

          {/* Notes - match Video page behavior */}
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>{t('videoPlayer.notes')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  {lastNotesSavedAt ? t('videoPlayer.lastSaved', { value: new Date(lastNotesSavedAt).toLocaleString() }) : t('videoPlayer.notSavedYet')}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setIsEditingNotes(v => !v)}>
                  {isEditingNotes ? t('videoPlayer.view') : t('videoPlayer.edit')}
                </Button>
                <Chip 
                  label={autoSaveNotes ? t('videoPlayer.autoSaveOn') : t('videoPlayer.autoSaveOff')}
                  color={autoSaveNotes ? 'success' : 'default'}
                  onClick={() => setAutoSaveNotes(v => !v)}
                  variant={autoSaveNotes ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              </Box>
            </Box>
            {isEditingNotes ? (
              <>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  placeholder={t('videoPlayer.addNotesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes ? t('videoPlayer.saving') : t('videoPlayer.saveNotes')}
                </Button>
              </>
            ) : (
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {notes || ''}
                </Typography>
              </Box>
            )}
          </Box>

          <Snackbar open={notesSavedOpen} autoHideDuration={2000} onClose={() => setNotesSavedOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <MuiAlert elevation={6} variant="filled" severity="success" sx={{ width: '100%' }}>
              {t('videoPlayer.notesSaved')}
            </MuiAlert>
          </Snackbar>

          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<NextIcon />}
              onClick={markCompletedAndNext}
              sx={{ px: 4, py: 1.5, fontWeight: 'bold' }}
            >
              Next
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default FileViewer;



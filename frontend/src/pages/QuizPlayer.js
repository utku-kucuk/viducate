import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Paper, Button, Chip, Divider, RadioGroup, Radio, FormControlLabel, Alert } from '@mui/material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const QuizPlayer = () => {
  const { t } = useTranslation();
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [courseId, setCourseId] = useState(null);

  const params = new URLSearchParams(location.search);
  const videoId = params.get('videoId');
  const nextVideoId = params.get('nextVideoId');

  const startAttempt = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (videoId) {
        const vresp = await axios.get(`/api/videos/${videoId}`);
        const vd = vresp?.data?.data;
        if (vd?.courseId) setCourseId(vd.courseId);
        // Soft gate on client: ensure video is completed before allowing quiz
        try {
          const pg = await axios.get(`/api/progress/video/${videoId}`);
          const progress = pg?.data?.progress || pg?.data?.data || null;
          const watchedPct = Number(progress?.watchPercentage || 0);
          const completed = Boolean(progress?.isCompleted) || watchedPct >= 90;
          if (!completed) {
            setError(t('quizPlayer.mustCompleteVideo', 'Please complete the video before attempting the quiz.'));
            setLoading(false);
            return;
          }
        } catch (e) {
          // If progress not found, treat as not completed
          setError(t('quizPlayer.mustCompleteVideo', 'Please complete the video before attempting the quiz.'));
          setLoading(false);
          return;
        }
      }
      const resp = await axios.post(`/api/quizzes/${quizId}/attempts`, { videoId: videoId || null });
      setAttempt(resp?.data?.data);
      setAnswers({});
      setResult(null);
      setError(null);
    } catch (err) {
      console.error('Start quiz error:', err?.response?.data || err);
      const serverMsg = err?.response?.status === 403
        ? t('quizPlayer.mustCompleteVideo', 'Please complete the video before attempting the quiz.')
        : (err?.response?.data?.error || err?.message || 'Failed to start quiz.');
      const details = err?.response?.data?.details;
      setError(details ? `${serverMsg} - ${JSON.stringify(details)}` : serverMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { startAttempt(); }, [quizId, videoId]); 

  const handleSubmit = async () => {
    if (!attempt?.attemptId) return;
    if (attempt.questions?.some(q => !answers[q.id])) {
      setError('Please answer all questions before submitting.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId }));
      const token = localStorage.getItem('token');
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const resp = await axios.post(`/api/quizzes/attempts/${attempt.attemptId}/submit`, { answers: payload });
      setResult(resp?.data?.data);
    } catch (err) {
      console.error('Submit quiz error:', err?.response?.data || err);
      const serverMsg = err?.response?.data?.error || err?.message || 'Failed to submit quiz.';
      const details = err?.response?.data?.details;
      setError(details ? `${serverMsg} - ${JSON.stringify(details)}` : serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const resolveImageUrl = (url) => {
    if (!url) return url;
    if (/^https?:/i.test(url) || url.startsWith('data:')) return url;
    const base = process.env.REACT_APP_API_BASE_URL ||
      (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:5001' : `${window.location.origin}`);
    try {
      return new URL(url, base).toString();
    } catch {
      return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>{t('quizPlayer.quiz')}</Typography>
      {loading && <Typography>{t('quizPlayer.loading')}</Typography>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {attempt && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{attempt.quiz?.title}</Typography>
            <Chip label={t('quizPlayer.passThreshold', { pct: Math.round((attempt.quiz?.passThreshold || 0.7) * 100) })} />
          </Box>
          <Divider sx={{ mb: 2 }} />
          {attempt.questions?.map((q, idx) => (
            <Box key={q.id} sx={{ mb: 2 }}>
              {q.imageUrl && (
                <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={resolveImageUrl(q.imageUrl)}
                    alt={`Question ${idx + 1}`}
                    style={{ width: '100%', height: 'auto', maxHeight: 360, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee' }}
                  />
                </Box>
              )}
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                {idx + 1}. {q.text}
              </Typography>
              <RadioGroup
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                disabled={Boolean(result)}
              >
                {q.options?.map(opt => (
                  <FormControlLabel key={opt.id} value={opt.id} control={<Radio disabled={Boolean(result)} />} label={opt.text} />
                ))}
              </RadioGroup>
            </Box>
          ))}
          <Button variant="contained" onClick={handleSubmit} disabled={submitting} sx={{ mt: 1 }}>
            {submitting ? t('quizPlayer.submitting') : t('quizPlayer.submit')}
          </Button>
          {result && (
            <Alert severity={result.passed ? 'success' : 'error'} sx={{ mt: 2 }}>
              {result.passed ? t('quizPlayer.passed', { score: Number(result.scorePct).toFixed(1) }) : t('quizPlayer.failed', { score: Number(result.scorePct).toFixed(1) })}
            </Alert>
          )}
        </Paper>
      )}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate(-1)}>{t('quizPlayer.back')}</Button>
        {error && videoId && (
          <Button variant="contained" color="primary" onClick={() => navigate(`/video/${videoId}`)}>
            {t('quizPlayer.goToVideo', 'Go to Video')}
          </Button>
        )}
        {!result?.passed && (
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => { startAttempt(); }}
          >
            {t('quizPlayer.retry')}
          </Button>
        )}
        <Button variant="contained" color="primary" disabled={!result?.passed} onClick={() => {
        if (!result?.passed) return;
        if (nextVideoId) {
          navigate(`/video/${nextVideoId}`);
        } else if (courseId) {
          navigate(`/course/${courseId}`);
        } else {
          navigate('/courses');
        }
        }}>
          {t('quizPlayer.proceedNext')}
        </Button>
      </Box>
    </Container>
  );
};

export default QuizPlayer;



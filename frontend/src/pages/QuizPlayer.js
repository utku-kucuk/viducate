import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Paper, Button, Chip, Divider, RadioGroup, Radio, FormControlLabel, Alert } from '@mui/material';
import axios from 'axios';

const QuizPlayer = () => {
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

  const videoId = new URLSearchParams(location.search).get('videoId');

  useEffect(() => {
    const start = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        if (videoId) {
          const vresp = await axios.get(`/api/videos/${videoId}`);
          const vd = vresp?.data?.data;
          if (vd?.courseId) setCourseId(vd.courseId);
        }
        const resp = await axios.post(`/api/quizzes/${quizId}/attempts`, { videoId: videoId || null });
        setAttempt(resp?.data?.data);
        setError(null);
      } catch (err) {
        console.error('Start quiz error:', err?.response?.data || err);
        const serverMsg = err?.response?.data?.error || err?.message || 'Failed to start quiz.';
        const details = err?.response?.data?.details;
        setError(details ? `${serverMsg} - ${JSON.stringify(details)}` : serverMsg);
      } finally {
        setLoading(false);
      }
    };
    start();
  }, [quizId, videoId]);

  const handleSubmit = async () => {
    if (!attempt?.attemptId) return;
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

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>Quiz</Typography>
      {loading && <Typography>Loading quiz...</Typography>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {attempt && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{attempt.quiz?.title}</Typography>
            <Chip label={`Pass ≥ ${Math.round((attempt.quiz?.passThreshold || 0.7) * 100)}%`} />
          </Box>
          <Divider sx={{ mb: 2 }} />
          {attempt.questions?.map((q, idx) => (
            <Box key={q.id} sx={{ mb: 2 }}>
              {q.imageUrl && (
                <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={q.imageUrl}
                    alt={`Question ${idx + 1}`}
                    style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee' }}
                  />
                </Box>
              )}
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                {idx + 1}. {q.text}
              </Typography>
              <RadioGroup
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              >
                {q.options?.map(opt => (
                  <FormControlLabel key={opt.id} value={opt.id} control={<Radio />} label={opt.text} />
                ))}
              </RadioGroup>
            </Box>
          ))}
          <Button variant="contained" onClick={handleSubmit} disabled={submitting} sx={{ mt: 1 }}>
            {submitting ? 'Submitting...' : 'Submit quiz'}
          </Button>
          {result && (
            <Alert severity={result.passed ? 'success' : 'error'} sx={{ mt: 2 }}>
              {result.passed ? `Passed! Score: ${Number(result.scorePct).toFixed(1)}%` : `Failed. Score: ${Number(result.scorePct).toFixed(1)}%. Try again.`}
            </Alert>
          )}
        </Paper>
      )}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
        {!result?.passed && (
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => { setAttempt(null); setAnswers({}); setResult(null); }}
          >
            Retry quiz
          </Button>
        )}
        <Button variant="contained" color="primary" disabled={!result?.passed} onClick={() => {
          if (courseId) navigate(`/course/${courseId}`); else navigate('/courses');
        }}>
          Proceed to next content
        </Button>
      </Box>
    </Container>
  );
};

export default QuizPlayer;



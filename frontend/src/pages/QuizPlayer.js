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
  const [canCompleteCourse, setCanCompleteCourse] = useState(false);
  const [completingCourse, setCompletingCourse] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');

  const params = new URLSearchParams(location.search);
  const videoId = params.get('videoId');
  const nextVideoId = params.get('nextVideoId');

  const startAttempt = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      let videoData = null;
      if (videoId) {
        const vresp = await axios.get(`/api/videos/${videoId}`);
        videoData = vresp?.data?.data;
        if (videoData?.courseId) setCourseId(videoData.courseId);
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
      
      // Check if this is the last content and if course can be completed
      if (videoId && videoData?.courseId) {
        checkCourseCompletionStatus(videoData.courseId, videoId);
      }
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
      const resultData = resp?.data?.data;
      setResult(resultData);
      
      // If quiz passed and this is the last content, check if course can be completed
      if (resultData?.passed && videoId && courseId) {
        await checkCourseCompletionStatus(courseId, videoId);
      }
    } catch (err) {
      console.error('Submit quiz error:', err?.response?.data || err);
      const serverMsg = err?.response?.data?.error || err?.message || 'Failed to submit quiz.';
      const details = err?.response?.data?.details;
      setError(details ? `${serverMsg} - ${JSON.stringify(details)}` : serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Check if course can be completed
  const checkCourseCompletionStatus = async (courseId, currentVideoId) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Get course data
      const courseResp = await axios.get(`/api/courses/${courseId}`);
      const course = courseResp?.data?.data;
      
      // Get all videos in course
      let allVideos = [];
      if (course.chapters && Array.isArray(course.chapters)) {
        course.chapters.forEach(chapter => {
          if (chapter.sections && Array.isArray(chapter.sections)) {
            chapter.sections.forEach(section => {
              if (section.videos && Array.isArray(section.videos)) {
                section.videos.forEach(video => {
                  allVideos.push(video);
                });
              }
            });
          }
        });
      }
      if (allVideos.length === 0 && course.videos && Array.isArray(course.videos)) {
        allVideos = course.videos;
      }
      allVideos.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Check if current video is the last one
      const currentIndex = allVideos.findIndex(v => String(v.id) === String(currentVideoId));
      const isLast = currentIndex === allVideos.length - 1;
      
      if (isLast) {
        // Get all progress
        const contentIds = allVideos.map(v => v.id).filter(Boolean);
        const progressResp = await axios.get(`/api/progress/course/${courseId}`);
        const progressList = progressResp?.data?.progress || progressResp?.data?.data || [];
        const progressMap = {};
        progressList.forEach(p => {
          if (p.videoId) progressMap[p.videoId] = p;
        });
        
        // Check if all videos/files are completed
        let allCompleted = true;
        for (const video of allVideos) {
          const progress = progressMap[video.id];
          const isCompleted = progress && (progress.isCompleted || progress.watchPercentage >= 90);
          if (!isCompleted) {
            allCompleted = false;
            break;
          }
        }
        
        // Check required quizzes
        if (allCompleted) {
          for (const video of allVideos) {
            try {
              const quizResp = await axios.get(`/api/quizzes/video/${video.id}`);
              const quizInfo = quizResp?.data || {};
              if (quizInfo.hasQuiz && quizInfo.isRequired && !quizInfo.passed) {
                allCompleted = false;
                break;
              }
            } catch (e) {
              // ignore
            }
          }
        }
        
        setCanCompleteCourse(allCompleted);
      } else {
        setCanCompleteCourse(false);
      }
    } catch (error) {
      console.error('Error checking course completion status:', error);
      setCanCompleteCourse(false);
    }
  };

  const handleCompleteCourse = async () => {
    if (!courseId) return;
    
    try {
      setCompletingCourse(true);
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.post(`/api/courses/${courseId}/complete`);
      
      if (response.data.success) {
        setCourseCompleted(true);
        setCompletionMessage('Tebrikler! Kursu tamamladınız.');
        
        // Redirect to my learnings after 5 seconds
        setTimeout(() => {
          navigate('/my-learnings');
        }, 5000);
      }
    } catch (error) {
      console.error('Error completing course:', error);
      setCompletionMessage(error.response?.data?.message || 'Kurs tamamlanırken bir hata oluştu.');
    } finally {
      setCompletingCourse(false);
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
      {courseCompleted ? (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              {completionMessage || 'Tebrikler! Kursu tamamladınız.'}
            </Typography>
            <Typography variant="body2">
              5 saniye sonra My Learnings sayfasına yönlendirileceksiniz...
            </Typography>
          </Alert>
        </Box>
      ) : (
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
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
          {result?.passed && canCompleteCourse && !nextVideoId ? (
            <Button 
              variant="contained" 
              color="success" 
              onClick={handleCompleteCourse}
              disabled={completingCourse}
            >
              {completingCourse ? 'Tamamlanıyor...' : 'Kursu Tamamla'}
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary" 
              disabled={!result?.passed} 
              onClick={() => {
                if (!result?.passed) return;
                if (nextVideoId) {
                  navigate(`/video/${nextVideoId}`);
                } else if (courseId) {
                  navigate(`/course/${courseId}`);
                } else {
                  navigate('/courses');
                }
              }}
            >
              {t('quizPlayer.proceedNext')}
            </Button>
          )}
        </Box>
      )}
    </Container>
  );
};

export default QuizPlayer;



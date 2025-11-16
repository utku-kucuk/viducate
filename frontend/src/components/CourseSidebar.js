import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  IconButton,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  CheckBox as CheckBoxIcon,
  Lock as LockIcon,
  VideoLibrary as VideoIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const CourseSidebar = ({ courseData, currentVideoId, onVideoSelect, refreshKey, readonly = false }) => {
  const { user } = useAuth();
  const isTeacher = user && (user.role === 'teacher' || user.role === 'admin');
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { t } = useTranslation();
  const [expandedChapters, setExpandedChapters] = useState({});
  const [videoProgress, setVideoProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [placeholderToRealId, setPlaceholderToRealId] = useState({});
  const [videoQuizInfo, setVideoQuizInfo] = useState({}); // videoId -> { hasQuiz, passed, quizId, quizTitle, isRequired }

  // Map chapter video to real stored video id
  const resolveVideoId = (chapterVideo) => {
    if (!courseData || !Array.isArray(courseData.videos)) return undefined;
    const validIds = new Set(courseData.videos.map(v => v.id));
    if (chapterVideo?.id && validIds.has(chapterVideo.id)) return chapterVideo.id;
    if (chapterVideo?.title) {
      const byTitle = courseData.videos.find(v => v.title === chapterVideo.title);
      if (byTitle) return byTitle.id;
    }
    if (chapterVideo?.fileName) {
      const byFile = courseData.videos.find(v => typeof v.fileUrl === 'string' && v.fileUrl.endsWith(`/${chapterVideo.fileName}`));
      if (byFile) return byFile.id;
    }
    if (typeof chapterVideo?.order === 'number') {
      const byOrder = courseData.videos.find(v => v.order === chapterVideo.order);
      if (byOrder) return byOrder.id;
    }
    return undefined;
  };

  // Fetch video progress for all videos in the course
  useEffect(() => {
    const fetchVideoProgress = async () => {
      if (readonly) {
        setVideoProgress({});
        setLoading(false);
        return;
      }
      if (!courseData || !courseData.chapters) return;
      
      try {
        setLoading(true);
        // Ensure auth header is present (handles hard refreshes)
        const token = localStorage.getItem('token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        const allVideos = [];
        
        // Extract all videos from course structure
        courseData.chapters.forEach(chapter => {
          if (chapter.sections && Array.isArray(chapter.sections)) {
            chapter.sections.forEach(section => {
              if (section.videos && Array.isArray(section.videos)) {
                section.videos.forEach(video => {
                  const realId = resolveVideoId(video);
                  if (realId) {
                    allVideos.push({ placeholder: video, realId });
                  }
                });
              }
            });
          }
        });
        // store mapping for render-time resolution
        const map = {};
        allVideos.forEach(({ placeholder, realId }) => {
          map[placeholder.id || placeholder.title || realId] = realId;
        });
        setPlaceholderToRealId(map);

        // Fetch progress for all videos
        const progressPromises = allVideos.map(async ({ placeholder, realId }) => {
          try {
            // Use dedicated progress API for reliable completion status
            const response = await axios.get(`/api/progress/video/${realId}`);
            return {
              videoId: realId,
              progress: response.data.progress
            };
          } catch (error) {
            console.error(`Error fetching progress for video ${realId}:`, error);
            return {
              videoId: realId,
              progress: null
            };
          }
        });

        const progressResults = await Promise.all(progressPromises);
        const progressMap = {};
        progressResults.forEach(result => {
          progressMap[result.videoId] = result.progress;
        });

        setVideoProgress(progressMap);

        // Fetch quiz info for each video
        const quizPromises = allVideos.map(async ({ realId }) => {
          try {
            const resp = await axios.get(`/api/quizzes/video/${realId}`);
            return { videoId: realId, info: resp.data || { hasQuiz: false } };
          } catch (e) {
            return { videoId: realId, info: { hasQuiz: false } };
          }
        });
        const quizResults = await Promise.all(quizPromises);
        const quizMap = {};
        quizResults.forEach(r => { quizMap[r.videoId] = r.info; });
        setVideoQuizInfo(quizMap);
      } catch (error) {
        console.error('Error fetching video progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoProgress();
  }, [courseData, currentVideoId, refreshKey]);

  // Auto-expand chapters containing the current video
  useEffect(() => {
    if (courseData && courseData.chapters && currentVideoId) {
      const newExpandedChapters = {};
      courseData.chapters.forEach(chapter => {
        if (chapter.sections && Array.isArray(chapter.sections)) {
          chapter.sections.forEach(section => {
            if (section.videos && Array.isArray(section.videos)) {
              const hasCurrentVideo = section.videos.some(video => {
                const vid = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
                return vid === currentVideoId;
              });
              if (hasCurrentVideo) {
                newExpandedChapters[chapter.id] = true;
              }
            }
          });
        }
      });
      setExpandedChapters(newExpandedChapters);
    }
  }, [courseData, currentVideoId]);

  const handleChapterToggle = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const handleVideoClick = (video) => {
    if (onVideoSelect) {
      const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
      onVideoSelect({ ...video, id: realId });
    } else {
      const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
      const isFile = (video?.type === 'file') || /(\.pdf|\.pptx?|\/uploads\/files\/)/i.test(String(video?.fileUrl || ''));
      navigate(isFile ? `/file/${realId}` : `/video/${realId}`);
    }
  };

  const getVideoStatus = (video) => {
    const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
    const progress = videoProgress[realId];
    if (!progress) return 'not-started';
    
    // CRITICAL: Trust server's isCompleted flag ONLY - no fallback to watchPercentage
    // Server is the single source of truth for completion status per COMPLETION_RULES.md
    // watchPercentage >= 90 check removed to prevent false positives
    if (progress.isCompleted === true) return 'completed';
    if (progress.watchPercentage > 0) return 'in-progress';
    return 'not-started';
  };

  const getQuizStatus = (video) => {
    const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
    const info = videoQuizInfo[realId] || {};
    if (!info.hasQuiz) return 'none';
    return info.passed ? 'completed' : 'pending';
  };

  // Build ordered content items (video/file and their quiz) and compute gating based on strict sequence
  const getOrderedItems = () => {
    const items = [];
    if (!courseData?.chapters) return items;
    courseData.chapters.forEach((chapter, ci) => {
      chapter.sections?.forEach((section, si) => {
        section.videos?.forEach((video, vi) => {
          const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
          const vItem = { kind: 'video', id: realId, video, ci, si, vi };
          items.push(vItem);
          const qInfo = videoQuizInfo.hasOwnProperty(realId) ? (videoQuizInfo[realId] || {}) : undefined;
          if (qInfo === undefined) {
            // Quiz info not loaded yet for this video: insert a gating placeholder
            items.push({
              kind: 'quizUnknown',
              videoId: realId,
              ci, si, vi
            });
          } else if (qInfo.hasQuiz) {
            items.push({
              kind: 'quiz',
              videoId: realId,
              quizId: qInfo.quizId,
              quizTitle: qInfo.quizTitle,
              isRequired: !!qInfo.isRequired,
              unlockNextOnPass: qInfo.unlockNextOnPass !== undefined ? !!qInfo.unlockNextOnPass : true,
              passed: !!qInfo.passed,
              ci, si, vi
            });
          }
        });
      });
    });
    return items;
  };

  const isItemCompletedForGating = (item) => {
    if (item.kind === 'video') {
      return getVideoStatus(item.video) === 'completed';
    }
    if (item.kind === 'quiz') {
      // If quiz is required (or unlockNextOnPass true), it must be passed to be "completed" for gating
      const blocksNext = item.isRequired || item.unlockNextOnPass;
      return blocksNext ? !!item.passed : true;
    }
    if (item.kind === 'quizUnknown') {
      // Be conservative until quiz info loads: treat as blocking
      return false;
    }
    return false;
  };

  const getFirstIncompleteIndex = (items) => {
    for (let i = 0; i < items.length; i++) {
      if (!isItemCompletedForGating(items[i])) {
        return i;
      }
    }
    return items.length; // all completed
  };

  const isVideoLocked = (video) => {
    const ordered = getOrderedItems();
    if (ordered.length === 0) return true;
    const firstIncomplete = getFirstIncompleteIndex(ordered);
    const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
    const idx = ordered.findIndex(it => it.kind === 'video' && it.id === realId);
    if (idx === -1) return true;
    if (realId === currentVideoId) return false; // allow interacting with the currently open item
    // Locked if it comes after the first incomplete item
    return idx > firstIncomplete;
  };

  const getVideoIcon = (video, isLocked) => {
    if (isLocked) {
      return <LockIcon color="disabled" />;
    }
    const status = getVideoStatus(video);
    switch (status) {
      case 'completed':
        return <CheckBoxIcon color="success" />;
      case 'in-progress':
        return <CheckBoxOutlineBlankIcon color="action" />;
      default:
        return <CheckBoxOutlineBlankIcon color="action" />;
    }
  };

  const getVideoTextColor = (video, isLocked, isCurrent) => {
    if (isCurrent) return 'primary.main';
    if (isLocked) return 'text.disabled';
    const status = getVideoStatus(video);
    switch (status) {
      case 'completed':
        return 'success.main';
      case 'in-progress':
        return 'primary.main';
      default:
        return 'text.primary';
    }
  };

  const calculateCourseProgress = () => {
    if (!courseData || !courseData.chapters) return 0;
    
    let totalItems = 0;
    let completedItems = 0;
    
    courseData.chapters.forEach(chapter => {
      if (chapter.sections && Array.isArray(chapter.sections)) {
        chapter.sections.forEach(section => {
          if (section.videos && Array.isArray(section.videos)) {
            section.videos.forEach(video => {
              totalItems++;
              const status = getVideoStatus(video);
              if (status === 'completed') completedItems++;
              // count quiz if exists
              const qStatus = getQuizStatus(video);
              if (qStatus !== 'none') {
                totalItems++;
                if (qStatus === 'completed') completedItems++;
              }
            });
          }
        });
      }
    });
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  if (!courseData) {
    return null;
  }

  const courseProgress = calculateCourseProgress();

  return (
    <Box sx={{ 
      width: sidebarOpen ? 300 : 60,
      minHeight: '100vh',
      bgcolor: 'grey.50',
      borderRight: '1px solid',
      borderColor: 'divider',
      transition: 'width 0.3s ease',
      position: 'sticky',
      top: 0,
      overflowY: 'auto'
    }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {sidebarOpen && (
            <Box>
              <Typography variant="h6" noWrap>
                {t('courseSidebar.courseContent')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <CircularProgress
                  variant="determinate"
                  value={courseProgress}
                  size={24}
                  thickness={4}
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  {t('courseSidebar.completePct', { pct: courseProgress })}
                </Typography>
              </Box>
            </Box>
          )}
          <IconButton onClick={() => setSidebarOpen(!sidebarOpen)}>
            <MenuIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Course Structure */}
      {sidebarOpen && (
        <Box sx={{ p: 1 }}>
          {courseData.chapters && courseData.chapters.map((chapter, chapterIndex) => (
            <Accordion
              key={chapter?.id || `chapter-${chapterIndex}`}
              expanded={expandedChapters[chapter.id] || false}
              onChange={() => handleChapterToggle(chapter.id)}
              sx={{ mb: 1, boxShadow: 'none' }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  minHeight: 48,
                  '&.Mui-expanded': { minHeight: 48 }
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {chapter.title}
                </Typography>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: 0 }}>
                {chapter.sections && chapter.sections.map((section, sectionIndex) => (
                  <Box key={section?.id || `section-${chapterIndex}-${sectionIndex}` } sx={{ mb: 1 }}>
                  <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography 
                      variant="body2" 
                      color="textSecondary" 
                      sx={{ fontWeight: 'medium' }}
                    >
                      {section.title}
                    </Typography>
                    {(() => {
                      const filesCount = (section.videos || []).filter(v => (v?.type === 'file') || /(\.pdf|\/uploads\/files\/)/i.test(String(v?.fileUrl || ''))).length;
                      const videosCount = (section.videos || []).length - filesCount;
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={`${filesCount} ${filesCount === 1 ? 'file' : 'files'}`} size="small" />
                          <Chip label={`${videosCount} ${videosCount === 1 ? 'video' : 'videos'}`} size="small" />
                        </Box>
                      );
                    })()}
                  </Box>
                    
                    <List dense>
                      {section.videos && section.videos.map((video, videoIndex) => {
                        const isLocked = isVideoLocked(video);
                        const isCurrent = video.id === currentVideoId;
                        const status = getVideoStatus(video);
                        const quizInfo = videoQuizInfo[(resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id)] || {};
                        
                        const keyId = video?.id || `${chapterIndex}-${sectionIndex}-${videoIndex}`;
                        return (
                          <Box key={keyId}>
                            <ListItem disablePadding>
                              <ListItemButton
                                onClick={() => !isLocked && handleVideoClick(video)}
                                disabled={isLocked}
                                sx={{
                                  py: 0.5,
                                  px: 2,
                                  bgcolor: isCurrent ? 'primary.light' : 'transparent',
                                  '&:hover': {
                                    bgcolor: isCurrent ? 'primary.light' : 'grey.100'
                                  }
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  {getVideoIcon(video, isLocked)}
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: getVideoTextColor(video, isLocked, isCurrent),
                                        fontWeight: isCurrent ? 'bold' : 'normal'
                                      }}
                                    >
                                      {video.title}
                                    </Typography>
                                  }
                                  secondary={
                                    isLocked ? (
                                      <Typography variant="caption" color="textSecondary">
                                        {t('courseSidebar.lockedMessage')}
                                      </Typography>
                                    ) : status === 'in-progress' ? (
                                      <Typography variant="caption" color="primary">
                                        {t('courseSidebar.inProgress')}
                                      </Typography>
                                    ) : status === 'completed' ? (
                                      <Typography variant="caption" color="success.main">
                                        {t('courseSidebar.complete')}
                                      </Typography>
                                    ) : null
                                  }
                                />
                              </ListItemButton>
                            </ListItem>

                            {quizInfo.hasQuiz && (
                              <ListItem disablePadding>
                                {(() => {
                                  const ordered = getOrderedItems();
                                  const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
                                  const quizIdx = ordered.findIndex(it => it.kind === 'quiz' && it.videoId === realId && it.quizId === quizInfo.quizId);
                                  const firstIncomplete = getFirstIncompleteIndex(ordered);
                                  const locked = (quizIdx === -1 ? true : (quizIdx > firstIncomplete));
                                  const passed = !!quizInfo.passed;
                                  return (
                                    <ListItemButton
                                      onClick={() => navigate(`/quiz/${quizInfo.quizId}?videoId=${realId}`)}
                                      disabled={locked}
                                    >
                                      <ListItemIcon sx={{ minWidth: 32 }}>
                                        {locked ? <LockIcon color="disabled" /> : (passed ? <CheckBoxIcon color="success" /> : <CheckBoxOutlineBlankIcon color="action" />)}
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2">{t('courseSidebar.quizTitle', { title: quizInfo.quizTitle || 'Chapter quiz' })}</Typography>
                                            {quizInfo.isRequired && <Chip label={t('courseSidebar.required')} size="small" />}
                                          </Box>
                                        }
                                        secondary={passed ? (
                                          <Typography variant="caption" color="success.main">{t('courseSidebar.passed')}</Typography>
                                        ) : locked ? (
                                          <Typography variant="caption" color="textSecondary">{t('courseSidebar.completePrevFirst')}</Typography>
                                        ) : (
                                          <Typography variant="caption" color="textSecondary">{t('courseSidebar.notCompleted')}</Typography>
                                        )}
                                      />
                                    </ListItemButton>
                                  );
                                })()}
                              </ListItem>
                            )}
                          </Box>
                        );
                      })}
                    </List>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default CourseSidebar;

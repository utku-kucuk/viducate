import React, { useState, useEffect } from 'react';
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
  IconButton
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

const CourseSidebar = ({ courseData, currentVideoId, onVideoSelect, refreshKey }) => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [expandedChapters, setExpandedChapters] = useState({});
  const [videoProgress, setVideoProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [placeholderToRealId, setPlaceholderToRealId] = useState({});

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
      navigate(`/video/${realId}`);
    }
  };

  const getVideoStatus = (video) => {
    const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
    const progress = videoProgress[realId];
    if (!progress) return 'not-started';
    
    if (progress.isCompleted) return 'completed';
    if (progress.watchPercentage >= 90) return 'completed';
    if (progress.watchPercentage > 0) return 'in-progress';
    return 'not-started';
  };

  // Flatten course videos in UI order
  const getAllVideosInOrder = () => {
    const list = [];
    if (!courseData?.chapters) return list;
    courseData.chapters.forEach((chapter, ci) => {
      chapter.sections?.forEach((section, si) => {
        section.videos?.forEach((video, vi) => {
          const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
          list.push({ video: { ...video, id: realId }, ci, si, vi });
        });
      });
    });
    return list;
  };

  const isVideoLocked = (video) => {
    const all = getAllVideosInOrder();
    if (all.length === 0) return true;
    // find contiguous completed prefix length
    let prefixCompleted = 0;
    for (let i = 0; i < all.length; i++) {
      const v = all[i].video;
      const status = getVideoStatus(v);
      if (status === 'completed') {
        prefixCompleted++;
        continue;
      }
      break;
    }
    const realId = resolveVideoId(video) || placeholderToRealId[video.id || video.title] || video.id;
    if (realId === currentVideoId) return false; // current video should always be interactive
    const idx = all.findIndex(item => item.video.id === realId);
    if (idx === -1) return true;
    // Unlocked if already in the completed prefix, or is the immediate next video
    return !(idx <= prefixCompleted);
  };

  const getVideoIcon = (video, isLocked) => {
    if (isLocked) {
      return <LockIcon color="disabled" />;
    }
    
    const status = getVideoStatus(video);
    switch (status) {
      case 'completed':
        return <CheckBoxIcon color="success" />; // persistent tick
      case 'in-progress':
        return <CheckBoxOutlineBlankIcon color="action" />; // unlocked but not completed
      default:
        return <CheckBoxOutlineBlankIcon color="action" />; // next-up or unlocked
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
    
    let totalVideos = 0;
    let completedVideos = 0;
    
    courseData.chapters.forEach(chapter => {
      if (chapter.sections && Array.isArray(chapter.sections)) {
        chapter.sections.forEach(section => {
          if (section.videos && Array.isArray(section.videos)) {
            section.videos.forEach(video => {
              totalVideos++;
              const status = getVideoStatus(video);
              if (status === 'completed') {
                completedVideos++;
              }
            });
          }
        });
      }
    });
    
    return totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
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
                Course Content
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
                  {courseProgress}% Complete
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
              key={chapter.id}
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
                  <Box key={section.id} sx={{ mb: 1 }}>
                    <Typography 
                      variant="body2" 
                      color="textSecondary" 
                      sx={{ px: 2, py: 1, fontWeight: 'medium' }}
                    >
                      {section.title}
                    </Typography>
                    
                    <List dense>
                      {section.videos && section.videos.map((video, videoIndex) => {
                        const isLocked = isVideoLocked(video);
                        const isCurrent = video.id === currentVideoId;
                        const status = getVideoStatus(video);
                        
                        return (
                          <ListItem key={video.id} disablePadding>
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
                                      Complete previous videos to unlock
                                    </Typography>
                                  ) : status === 'in-progress' ? (
                                    <Typography variant="caption" color="primary">
                                      In Progress
                                    </Typography>
                                  ) : status === 'completed' ? (
                                    <Typography variant="caption" color="success.main">
                                      Completed
                                    </Typography>
                                  ) : null
                                }
                              />
                            </ListItemButton>
                          </ListItem>
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

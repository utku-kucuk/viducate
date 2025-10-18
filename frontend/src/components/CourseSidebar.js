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
  Chip,
  CircularProgress,
  IconButton,
  Collapse
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Lock as LockIcon,
  VideoLibrary as VideoIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import axios from 'axios';

const CourseSidebar = ({ courseData, currentVideoId, onVideoSelect }) => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [expandedChapters, setExpandedChapters] = useState({});
  const [videoProgress, setVideoProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch video progress for all videos in the course
  useEffect(() => {
    const fetchVideoProgress = async () => {
      if (!courseData || !courseData.chapters) return;
      
      try {
        setLoading(true);
        const allVideos = [];
        
        // Extract all videos from course structure
        courseData.chapters.forEach(chapter => {
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

        // Fetch progress for all videos
        const progressPromises = allVideos.map(async (video) => {
          try {
            const response = await axios.get(`/api/videos/${video.id}`);
            return {
              videoId: video.id,
              progress: response.data.data.progress
            };
          } catch (error) {
            console.error(`Error fetching progress for video ${video.id}:`, error);
            return {
              videoId: video.id,
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
  }, [courseData]);

  // Auto-expand chapters containing the current video
  useEffect(() => {
    if (courseData && courseData.chapters && currentVideoId) {
      const newExpandedChapters = {};
      courseData.chapters.forEach(chapter => {
        if (chapter.sections && Array.isArray(chapter.sections)) {
          chapter.sections.forEach(section => {
            if (section.videos && Array.isArray(section.videos)) {
              const hasCurrentVideo = section.videos.some(video => video.id === currentVideoId);
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
      onVideoSelect(video);
    } else {
      navigate(`/video/${video.id}`);
    }
  };

  const getVideoStatus = (video) => {
    const progress = videoProgress[video.id];
    if (!progress) return 'not-started';
    
    if (progress.isCompleted) return 'completed';
    if (progress.watchPercentage >= 90) return 'completed';
    if (progress.watchPercentage > 0) return 'in-progress';
    return 'not-started';
  };

  const isVideoLocked = (video, videoIndex, chapterIndex, sectionIndex) => {
    // First video is never locked
    if (chapterIndex === 0 && sectionIndex === 0 && videoIndex === 0) {
      return false;
    }

    // Check if previous videos in the same section are completed
    if (sectionIndex > 0) {
      const currentChapter = courseData.chapters[chapterIndex];
      const currentSection = currentChapter.sections[sectionIndex];
      const previousSection = currentChapter.sections[sectionIndex - 1];
      
      if (previousSection && previousSection.videos) {
        const hasIncompleteVideo = previousSection.videos.some(v => {
          const status = getVideoStatus(v);
          return status !== 'completed';
        });
        if (hasIncompleteVideo) return true;
      }
    }

    // Check if previous video in same section is completed
    if (videoIndex > 0) {
      const currentChapter = courseData.chapters[chapterIndex];
      const currentSection = currentChapter.sections[sectionIndex];
      const previousVideo = currentSection.videos[videoIndex - 1];
      
      if (previousVideo) {
        const status = getVideoStatus(previousVideo);
        if (status !== 'completed') return true;
      }
    }

    return false;
  };

  const getVideoIcon = (video, isLocked) => {
    if (isLocked) {
      return <LockIcon color="disabled" />;
    }
    
    const status = getVideoStatus(video);
    switch (status) {
      case 'completed':
        return <CheckIcon color="success" />;
      case 'in-progress':
        return <PlayIcon color="primary" />;
      default:
        return <VideoIcon color="action" />;
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
                        const isLocked = isVideoLocked(video, videoIndex, chapterIndex, sectionIndex);
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

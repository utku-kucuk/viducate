const { Progress, Video, User, Course, UserCourse, QuizAttempt } = require('../models');

// Calculate engagement score (0-100)
function calculateEngagementScore(progress) {
  console.log('=== ENGAGEMENT SCORE CALCULATION START ===');
  console.log('Input progress data:', {
    watchPercentage: progress.watchPercentage,
    consecutiveWatchTime: progress.consecutiveWatchTime,
    totalDuration: progress.totalDuration,
    averageWatchSession: progress.averageWatchSession,
    notes: progress.notes,
    replayCount: progress.replayCount,
    pauseCount: progress.pauseCount,
    playCount: progress.playCount
  });

  let score = 0;
  
  // Base score from watch percentage (40% weight)
  const watchScore = (progress.watchPercentage || 0) * 0.4;
  score += watchScore;
  console.log('Watch score (40%):', watchScore);
  
  // Consecutive watch time bonus (20% weight)
  let consecutiveScore = 0;
  if (progress.totalDuration > 0) {
    const consecutiveRatio = progress.consecutiveWatchTime / progress.totalDuration;
    consecutiveScore = Math.min(consecutiveRatio * 100, 20);
    score += consecutiveScore;
    console.log('Consecutive score (20%):', consecutiveScore, 'ratio:', consecutiveRatio);
  }
  
  // Session quality bonus (20% weight)
  let sessionScore = 0;
  if (progress.averageWatchSession > 0) {
    const sessionQuality = Math.min(progress.averageWatchSession / 300, 1); // 5 minutes = 100%
    sessionScore = sessionQuality * 20;
    score += sessionScore;
    console.log('Session score (20%):', sessionScore, 'quality:', sessionQuality);
  }
  
  // Engagement indicators (20% weight)
  let engagementIndicators = 0;
  if (progress.notes && progress.notes.length > 10) {
    engagementIndicators += 5;
    console.log('Notes bonus: +5');
  }
  if (progress.replayCount > 0) {
    engagementIndicators += 5;
    console.log('Replay bonus: +5');
  }
  if (progress.pauseCount > 0 && progress.pauseCount < 10) {
    engagementIndicators += 5;
    console.log('Pause bonus: +5');
  }
  if (progress.playCount > 1) {
    engagementIndicators += 5;
    console.log('Multiple sessions bonus: +5');
  }

  score += engagementIndicators;
  console.log('Engagement indicators (20%):', engagementIndicators);

  const finalScore = Math.max(0, Math.min(score, 100));
  console.log('Final engagement score:', finalScore);
  console.log('=== ENGAGEMENT SCORE CALCULATION END ===');

  return finalScore;
}

// Update video watching progress
const updateProgress = async (req, res) => {
  try {
    console.log('=== UPDATE PROGRESS CALLED ===');
    console.log('Request body:', req.body);
    console.log('Video ID:', req.params.videoId);
    console.log('User ID:', req.user.id);
    
    const { videoId } = req.params;
    const { 
      watchDuration, 
      totalDuration, 
      watchPercentage,
      rating, 
      notes,
      consecutiveWatchTime,
      pauseCount,
      seekCount,
      replayCount,
      lastSessionDuration,
      playCount,
      watchedSegments
    } = req.body;
    const userId = req.user.id;

    // Ensure user is enrolled in the video's course; disallow progress in preview/owner mode
    const videoRecord = await Video.findByPk(videoId);
    if (!videoRecord) {
      return res.status(404).json({ error: 'Video not found.' });
    }
    const courseId = videoRecord.courseId;
    // If user is the course owner (teacher/admin who created), block progress updates
    const course = await Course.findByPk(courseId);
    if (course && course.teacherId === userId) {
      return res.status(403).json({ error: 'Progress updates are not allowed for course owners.' });
    }
    // If not enrolled, block progress updates
    const isEnrolled = await UserCourse.findOne({ where: { userId, courseId } });
    if (!isEnrolled) {
      return res.status(403).json({ error: 'Progress updates require enrollment.' });
    }

    // Find or create progress record
    let progress = await Progress.findOne({
      where: { userId, videoId }
    });

    console.log('Existing progress found:', !!progress);

    // Calculate total watched duration from segments
    let totalWatchedDuration = 0;
    if (watchedSegments && watchedSegments.length > 0) {
      // Filter out temporary segments for calculation
      const finalSegments = watchedSegments.filter(seg => !seg.isTemporary);
      totalWatchedDuration = finalSegments.reduce((total, segment) => {
        return total + (segment.end - segment.start);
      }, 0);
    }
    
    // Use the maximum of provided watch duration or calculated from segments
    const finalWatchedDuration = Math.max(watchDuration || 0, totalWatchedDuration);
    const calculatedWatchPercentage = totalDuration > 0 ? (finalWatchedDuration / totalDuration) * 100 : 0;
    
    console.log('=== PROGRESS CALCULATION ===');
    console.log('Watched segments:', watchedSegments);
    console.log('Total watched duration:', finalWatchedDuration);
    console.log('Total duration:', totalDuration);
    console.log('Watch percentage:', calculatedWatchPercentage);

    if (!progress) {
      console.log('Creating new progress record...');
      // Create new progress record
      progress = await Progress.create({
        userId,
        videoId,
        watchedDuration: finalWatchedDuration,
        totalDuration,
        watchPercentage: calculatedWatchPercentage,
        rating,
        notes,
        consecutiveWatchTime: consecutiveWatchTime || 0,
        pauseCount: pauseCount || 0,
        seekCount: seekCount || 0,
        replayCount: replayCount || 0,
        lastSessionDuration: lastSessionDuration || 0,
        playCount: playCount || 1,
        watchedSegments: watchedSegments || [],
        lastWatchedAt: new Date()
      });
      console.log('New progress created:', progress.id);
    } else {
      console.log('Updating existing progress record...');
      // Update existing progress
      const       updateData = {
        watchedDuration: finalWatchedDuration,
        totalDuration,
        watchPercentage: calculatedWatchPercentage,
        watchedSegments: watchedSegments || [],
        lastWatchedAt: new Date()
      };

      if (rating !== undefined) updateData.rating = rating;
      if (notes !== undefined) updateData.notes = notes;
      if (consecutiveWatchTime !== undefined) updateData.consecutiveWatchTime = consecutiveWatchTime;
      if (pauseCount !== undefined) updateData.pauseCount = pauseCount;
      if (seekCount !== undefined) updateData.seekCount = seekCount;
      if (replayCount !== undefined) updateData.replayCount = replayCount;
      if (lastSessionDuration !== undefined) updateData.lastSessionDuration = lastSessionDuration;
      if (playCount !== undefined) updateData.playCount = playCount;
      if (watchedSegments !== undefined) updateData.watchedSegments = watchedSegments;

      console.log('Update data:', updateData);
      await progress.update(updateData);
      console.log('Progress updated');
    }

    // Manually calculate and update engagement score
    console.log('Calculating engagement score manually...');
    const progressData = {
      watchPercentage: progress.watchPercentage,
      consecutiveWatchTime: progress.consecutiveWatchTime || 0,
      totalDuration: progress.totalDuration,
      averageWatchSession: progress.averageWatchSession || 0,
      notes: progress.notes,
      replayCount: progress.replayCount || 0,
      pauseCount: progress.pauseCount || 0,
      playCount: progress.playCount || 1
    };
    
    const calculatedEngagementScore = calculateEngagementScore(progressData);
    console.log('Calculated engagement score:', calculatedEngagementScore);
    
    // Update the engagement score manually
    await progress.update({ engagementScore: calculatedEngagementScore });
    console.log('Engagement score updated in database');

    // Check for completion (90% threshold)
    const completionThreshold = 90; // 90%
    const currentWatchPercentage = calculatedWatchPercentage;
    const wasCompleted = progress.isCompleted;
    const isNowCompleted = currentWatchPercentage >= completionThreshold && !wasCompleted;
    
    if (isNowCompleted) {
      console.log(`Video completed! Watch percentage: ${currentWatchPercentage}%`);
      await progress.update({ 
        isCompleted: true, 
        completionMethod: 'automatic',
        completionDate: new Date()
      });
    }

    // Refresh progress data to get updated completion status
    await progress.reload();

    // Update video views
    await Video.increment('views', { where: { id: videoId } });

    console.log('Final progress data:', {
      id: progress.id,
      watchedDuration: progress.watchedDuration,
      totalDuration: progress.totalDuration,
      watchPercentage: progress.watchPercentage,
      isCompleted: progress.isCompleted,
      engagementScore: progress.engagementScore,
      consecutiveWatchTime: progress.consecutiveWatchTime,
      pauseCount: progress.pauseCount,
      seekCount: progress.seekCount,
      replayCount: progress.replayCount,
      playCount: progress.playCount,
      completionMethod: progress.completionMethod
    });

    res.json({
      message: 'Progress updated successfully',
      progress: {
        id: progress.id,
        watchedDuration: progress.watchedDuration,
        totalDuration: progress.totalDuration,
        watchPercentage: progress.watchPercentage,
        isCompleted: progress.isCompleted,
        lastWatchedAt: progress.lastWatchedAt,
        engagementScore: progress.engagementScore,
        consecutiveWatchTime: progress.consecutiveWatchTime,
        pauseCount: progress.pauseCount,
        seekCount: progress.seekCount,
        replayCount: progress.replayCount,
        playCount: progress.playCount,
        completionMethod: progress.completionMethod,
        notes: progress.notes
      }
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress.' });
  }
};

// Get user's progress for a specific video
const getVideoProgress = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.id;

    const progress = await Progress.findOne({
      where: { userId, videoId },
      include: [
        {
          model: Video,
          as: 'video',
          attributes: ['id', 'title', 'duration', 'fileUrl']
        }
      ]
    });

    if (!progress) {
      return res.json({
        progress: null,
        message: 'No progress found for this video'
      });
    }

    res.json({ progress });
  } catch (error) {
    console.error('Get video progress error:', error);
    res.status(500).json({ error: 'Failed to get video progress.' });
  }
};

// Get user's overall progress
const getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const progress = await Progress.findAll({
      where: { userId },
      include: [
        {
          model: Video,
          as: 'video',
          attributes: ['id', 'title', 'duration', 'fileUrl', 'courseId'],
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['id', 'title']
            }
          ]
        }
      ],
      order: [['lastWatchedAt', 'DESC']]
    });

    res.json({ progress });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({ error: 'Failed to get user progress.' });
  }
};

// Get course progress for a user
const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const progress = await Progress.findAll({
      where: { userId },
      include: [
        {
          model: Video,
          as: 'video',
          where: { courseId },
          attributes: ['id', 'title', 'duration', 'fileUrl', 'courseId']
        }
      ],
      order: [['lastWatchedAt', 'DESC']]
    });

    const courseStats = {
      totalVideos: progress.length,
      completedVideos: progress.filter(p => p.isCompleted).length,
      totalWatchTime: progress.reduce((sum, p) => sum + (p.watchedDuration || 0), 0),
      averageEngagement: progress.length > 0 ? 
        progress.reduce((sum, p) => sum + (p.engagementScore || 0), 0) / progress.length : 0
    };

    res.json({ 
      progress,
      courseStats
    });
  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({ error: 'Failed to get course progress.' });
  }
};

// Get student progress for teacher
const getStudentProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.query;

    const progress = await Progress.findAll({
      where: { userId: studentId },
      include: [
        {
          model: Video,
          as: 'video',
          where: { courseId },
          attributes: ['id', 'title', 'duration', 'fileUrl']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['lastWatchedAt', 'DESC']]
    });

    // Enrich with quiz pass info for the student on each video
    try {
      const videoIds = progress.map(p => p.videoId);
      let passMap = new Map();
      if (videoIds.length > 0) {
        const attempts = await QuizAttempt.findAll({
          where: { userId: studentId, videoId: videoIds, passed: true },
          order: [['createdAt', 'DESC']]
        });
        attempts.forEach(a => {
          // mark as passed for this video id
          if (!passMap.has(a.videoId)) passMap.set(a.videoId, true);
        });
      }
      const enriched = progress.map(p => ({
        id: p.id,
        videoId: p.videoId,
        video: p.video,
        watchedDuration: p.watchedDuration,
        totalDuration: p.totalDuration,
        watchPercentage: p.watchPercentage,
        isCompleted: p.isCompleted,
        lastWatchedAt: p.lastWatchedAt,
        quizPassed: !!passMap.get(p.videoId)
      }));
      return res.json({ progress: enriched });
    } catch (e) {
      // fallback to raw progress if enrichment fails
      return res.json({ progress });
    }
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ error: 'Failed to get student progress.' });
  }
};

// Add watch session
const addWatchSession = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { sessionDuration, startTime, endTime, engagementData } = req.body;
    const userId = req.user.id;

    let progress = await Progress.findOne({
      where: { userId, videoId }
    });

    if (!progress) {
      progress = await Progress.create({
        userId,
        videoId,
        watchedDuration: sessionDuration,
        totalDuration: 0,
        lastWatchedAt: new Date()
      });
    }

    // Update watch history
    const watchHistory = progress.watchHistory || [];
    watchHistory.push({
      sessionDuration,
      startTime,
      endTime,
      engagementData,
      timestamp: new Date()
    });

    // Calculate average session duration
    const totalSessions = watchHistory.length;
    const totalSessionTime = watchHistory.reduce((sum, session) => sum + session.sessionDuration, 0);
    const averageSession = totalSessions > 0 ? totalSessionTime / totalSessions : 0;

    await progress.update({
      watchHistory,
      averageWatchSession: averageSession,
      lastWatchedAt: new Date()
    });

    res.json({
      message: 'Watch session added successfully',
      progress: {
        id: progress.id,
        averageWatchSession: progress.averageWatchSession,
        watchHistory: progress.watchHistory
      }
    });
  } catch (error) {
    console.error('Add watch session error:', error);
    res.status(500).json({ error: 'Failed to add watch session.' });
  }
};

// Update notes only (creates minimal progress if missing)
const updateNotes = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { notes } = req.body || {};
    const userId = req.user.id;

    if (typeof notes !== 'string') {
      return res.status(400).json({ error: 'Notes must be a string.' });
    }

    let progress = await Progress.findOne({ where: { userId, videoId } });

    if (!progress) {
      // Create a minimal valid progress row to store notes
      progress = await Progress.create({
        userId,
        videoId,
        watchedDuration: 0,
        totalDuration: 1, // minimal positive per model validation
        watchPercentage: 0,
        notes,
        lastWatchedAt: new Date()
      });
    } else {
      await progress.update({ notes, lastWatchedAt: new Date() });
    }

    return res.json({
      message: 'Notes updated successfully',
      progress: {
        id: progress.id,
        videoId: progress.videoId,
        notes: progress.notes,
        lastWatchedAt: progress.lastWatchedAt
      }
    });
  } catch (error) {
    console.error('Update notes error:', error);
    return res.status(500).json({ error: 'Failed to update notes.' });
  }
};

module.exports = {
  updateProgress,
  getVideoProgress,
  getUserProgress,
  getCourseProgress,
  getStudentProgress,
  addWatchSession,
  updateNotes
};

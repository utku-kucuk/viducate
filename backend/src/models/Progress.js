const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Progress = sequelize.define('Progress', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  watchedDuration: {
    type: DataTypes.FLOAT, // Seconds watched (can be fractional)
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  totalDuration: {
    type: DataTypes.FLOAT, // Total video duration in seconds (can be fractional)
    allowNull: false,
    validate: {
      min: 0.1
    }
  },
  watchPercentage: {
    type: DataTypes.DECIMAL(5, 2), // Percentage watched (0-100)
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastWatchedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  watchHistory: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('watchHistory');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('watchHistory', JSON.stringify(value));
    }
  },
  playCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalWatchTime: {
    type: DataTypes.FLOAT, // Total time spent watching in seconds (can be fractional)
    defaultValue: 0
  },
  averageWatchSession: {
    type: DataTypes.FLOAT, // Average session duration in seconds (can be fractional)
    defaultValue: 0
  },
  completionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  bookmarkPosition: {
    type: DataTypes.INTEGER, // Bookmark position in seconds
    defaultValue: 0
  },
  // New fields for smart completion algorithm
  engagementScore: {
    type: DataTypes.DECIMAL(5, 2), // 0-100 engagement score
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  consecutiveWatchTime: {
    type: DataTypes.FLOAT, // Longest consecutive watch time in seconds (can be fractional)
    defaultValue: 0
  },
  pauseCount: {
    type: DataTypes.INTEGER, // Number of times video was paused
    defaultValue: 0
  },
  seekCount: {
    type: DataTypes.INTEGER, // Number of times user seeked
    defaultValue: 0
  },
  replayCount: {
    type: DataTypes.INTEGER, // Number of times user replayed sections
    defaultValue: 0
  },
  lastSessionDuration: {
    type: DataTypes.FLOAT, // Duration of last watch session (can be fractional)
    defaultValue: 0
  },
  completionMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: [['automatic', 'manual', 'engagement']]
    }
  },
  // New field for tracking watched segments
  watchedSegments: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('watchedSegments');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('watchedSegments', JSON.stringify(value));
    }
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  videoId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Videos',
      key: 'id'
    }
  }

}, {
  timestamps: true,
  hooks: {
    beforeSave: (progress) => {
      // Calculate watch percentage
      if (progress.totalDuration > 0) {
        progress.watchPercentage = (progress.watchedDuration / progress.totalDuration) * 100;
      }
      
      // Calculate engagement score based on multiple factors
      progress.engagementScore = calculateEngagementScore(progress);
      
      // Smart completion logic
      const shouldComplete = checkSmartCompletion(progress);
      if (shouldComplete && !progress.isCompleted) {
        progress.isCompleted = true;
        progress.completionDate = new Date();
        progress.completionMethod = determineCompletionMethod(progress);
      }
    }
  }
});

// Calculate engagement score (0-100) - Simplified to just watch percentage
function calculateEngagementScore(progress) {
  console.log('=== ENGAGEMENT SCORE CALCULATION START ===');
  console.log('Input progress data:', {
    watchPercentage: progress.watchPercentage,
    totalDuration: progress.totalDuration
  });

  // Engagement score = Watch percentage (simple and direct)
  const score = progress.watchPercentage || 0;
  
  console.log('Watch percentage = Engagement score:', score);
  console.log('=== ENGAGEMENT SCORE CALCULATION END ===');
  
  return score;
}

// Smart completion check - requires continuous watching
function checkSmartCompletion(progress) {
  console.log('=== COMPLETION CHECK START ===');
  console.log('Watched segments:', progress.watchedSegments);
  console.log('Total duration:', progress.totalDuration);
  
  if (!progress.watchedSegments || progress.watchedSegments.length === 0) {
    console.log('No watched segments found');
    return false;
  }
  
  // Calculate total watched time from segments
  let totalWatchedTime = 0;
  progress.watchedSegments.forEach(segment => {
    totalWatchedTime += (segment.end - segment.start);
  });
  
  // Calculate percentage of video actually watched
  const actualWatchPercentage = (totalWatchedTime / progress.totalDuration) * 100;
  
  console.log('Total watched time from segments:', totalWatchedTime);
  console.log('Actual watch percentage:', actualWatchPercentage);
  
  // Check if 90% or more of the video has been watched continuously
  const isCompleted = actualWatchPercentage >= 90;
  
  console.log('Video completed:', isCompleted);
  console.log('=== COMPLETION CHECK END ===');
  
  return isCompleted;
}

// Determine completion method
function determineCompletionMethod(progress) {
  if (progress.watchPercentage >= 90) return 'automatic';
  if (progress.engagementScore >= 80) return 'engagement';
  return 'automatic';
}

// Instance methods
Progress.prototype.getWatchPercentage = function() {
  return this.watchPercentage;
};

Progress.prototype.isVideoCompleted = function() {
  return this.isCompleted;
};

Progress.prototype.getRemainingTime = function() {
  return Math.max(0, this.totalDuration - this.watchedDuration);
};

Progress.prototype.getEngagementLevel = function() {
  if (this.engagementScore >= 80) return 'high';
  if (this.engagementScore >= 60) return 'medium';
  return 'low';
};

// Progress tracking methods
Progress.prototype.addWatchedSegment = function(startTime, endTime) {
  if (!this.watchedSegments) {
    this.watchedSegments = [];
  }
  
  // Add new segment
  this.watchedSegments.push({ start: startTime, end: endTime });
  
  // Merge overlapping segments
  this.watchedSegments = this.mergeSegments(this.watchedSegments);
  
  // Recalculate total watched duration
  this.recalculateWatchedDuration();
};

Progress.prototype.mergeSegments = function(segments) {
  if (segments.length <= 1) return segments;
  
  // Sort segments by start time
  segments.sort((a, b) => a.start - b.start);
  
  const merged = [segments[0]];
  
  for (let i = 1; i < segments.length; i++) {
    const current = segments[i];
    const last = merged[merged.length - 1];
    
    // If segments overlap or are adjacent, merge them
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  
  return merged;
};

Progress.prototype.recalculateWatchedDuration = function() {
  if (!this.watchedSegments || this.watchedSegments.length === 0) {
    this.watchedDuration = 0;
    return;
  }
  
  let totalWatched = 0;
  this.watchedSegments.forEach(segment => {
    totalWatched += (segment.end - segment.start);
  });
  
  this.watchedDuration = totalWatched;
};

Progress.prototype.getWatchedSegments = function() {
  return this.watchedSegments || [];
};

Progress.prototype.getSkippedSegments = function() {
  if (!this.watchedSegments || this.watchedSegments.length === 0) {
    return [{ start: 0, end: this.totalDuration }];
  }
  
  const skipped = [];
  let currentTime = 0;
  
  this.watchedSegments.forEach(segment => {
    if (currentTime < segment.start) {
      skipped.push({ start: currentTime, end: segment.start });
    }
    currentTime = Math.max(currentTime, segment.end);
  });
  
  if (currentTime < this.totalDuration) {
    skipped.push({ start: currentTime, end: this.totalDuration });
  }
  
  return skipped;
};

module.exports = Progress;

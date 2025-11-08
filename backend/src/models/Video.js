const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Video = sequelize.define('Video', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Multiple resolution support - stores array of {quality, url, fileSize}
  videoVariants: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('videoVariants');
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('videoVariants', Array.isArray(value) ? JSON.stringify(value) : '[]');
    }
  },
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in seconds
    allowNull: true,
    validate: {
      min: 1
    }
  },
  fileSize: {
    type: DataTypes.BIGINT, // File size in bytes (total or highest quality)
    allowNull: true
  },
  quality: {
    type: DataTypes.STRING,
    defaultValue: '720p',
    validate: {
      isIn: [['360p', '480p', '720p', '1080p', '1440p', '2160p']]
    }
  },
  format: {
    type: DataTypes.STRING,
    defaultValue: 'mp4'
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  dislikes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tags: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('tags');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(value));
    }
  },
  transcript: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subtitles: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('subtitles');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('subtitles', value ? JSON.stringify(value) : null);
    }
  },
  processingStatus: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'processing', 'completed', 'failed']]
    }
  },
  processingProgress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  courseId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Courses',
      key: 'id'
    }
  },
  teacherId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }

}, {
  timestamps: true
});

// Instance methods
Video.prototype.getDurationInSeconds = function() {
  return this.duration;
};

Video.prototype.getDurationFormatted = function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Get video URL for a specific quality, or default/highest available
Video.prototype.getVideoUrl = function(quality = null) {
  try {
    const variants = this.videoVariants || [];
    
    // If quality requested and exists, return it
    if (quality && Array.isArray(variants) && variants.length > 0) {
      const variant = variants.find(v => v && v.quality === quality);
      if (variant && variant.url) return variant.url;
    }
    
    // If variants exist, return highest quality (last one, assuming sorted)
    if (Array.isArray(variants) && variants.length > 0) {
      const sorted = [...variants].filter(v => v && v.quality && v.url).sort((a, b) => {
        const qualityOrder = { '360p': 1, '480p': 2, '720p': 3, '1080p': 4, '1440p': 5, '2160p': 6 };
        return (qualityOrder[a.quality] || 0) - (qualityOrder[b.quality] || 0);
      });
      if (sorted.length > 0 && sorted[sorted.length - 1].url) {
        return sorted[sorted.length - 1].url;
      }
    }
  } catch (error) {
    console.error('Error in getVideoUrl:', error);
  }
  
  // Fallback to legacy fileUrl (always return something)
  return this.fileUrl || null;
};

// Get available qualities
Video.prototype.getAvailableQualities = function() {
  try {
    const variants = this.videoVariants || [];
    if (Array.isArray(variants) && variants.length > 0) {
      const qualities = variants
        .filter(v => v && v.quality)
        .map(v => v.quality)
        .sort((a, b) => {
          const qualityOrder = { '360p': 1, '480p': 2, '720p': 3, '1080p': 4, '1440p': 5, '2160p': 6 };
          return (qualityOrder[a] || 0) - (qualityOrder[b] || 0);
        });
      if (qualities.length > 0) return qualities;
    }
  } catch (error) {
    console.error('Error in getAvailableQualities:', error);
  }
  
  // Legacy: return single quality if exists
  if (this.quality) {
    return [this.quality];
  }
  
  // If we have fileUrl but no quality info, return empty array (single resolution video)
  return [];
};

module.exports = Video;

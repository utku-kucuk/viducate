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
    type: DataTypes.BIGINT, // File size in bytes
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

module.exports = Video;

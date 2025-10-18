const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Course = sequelize.define('Course', {
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
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  level: {
    type: DataTypes.STRING,
    defaultValue: 'beginner',
    validate: {
      isIn: [['beginner', 'intermediate', 'advanced']]
    }
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  duration: {
    type: DataTypes.INTEGER, // Total duration in minutes
    defaultValue: 0
  },
  totalVideos: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  studentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 5
    }
  },
  totalRatings: {
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
  requirements: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('requirements');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('requirements', JSON.stringify(value));
    }
  },
  learningOutcomes: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const value = this.getDataValue('learningOutcomes');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('learningOutcomes', JSON.stringify(value));
    }
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'English'
  },
  certificate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  chapters: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    allowNull: true,
    get() {
      const value = this.getDataValue('chapters');
      return value ? JSON.parse(value) : [];
    },
    set(value) {
      this.setDataValue('chapters', JSON.stringify(value));
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

module.exports = Course;

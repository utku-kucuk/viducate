const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VideoQuiz = sequelize.define('VideoQuiz', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  videoId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Videos',
      key: 'id'
    }
  },
  quizId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Quizzes',
      key: 'id'
    }
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  unlockNextOnPass: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['videoId', 'quizId'] }
  ]
});

module.exports = VideoQuiz;



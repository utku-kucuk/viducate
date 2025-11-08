const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuizAttempt = sequelize.define('QuizAttempt', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Users',
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
  videoId: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'Videos',
      key: 'id'
    }
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  numCorrect: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  numQuestions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  scorePct: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  passed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attemptNo: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  timestamps: true
});

module.exports = QuizAttempt;



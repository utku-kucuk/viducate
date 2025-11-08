const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AttemptAnswer = sequelize.define('AttemptAnswer', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  attemptId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'QuizAttempts',
      key: 'id'
    }
  },
  questionId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Questions',
      key: 'id'
    }
  },
  optionId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Options',
      key: 'id'
    }
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

module.exports = AttemptAnswer;



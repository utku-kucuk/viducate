const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuizQuestion = sequelize.define('QuizQuestion', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quizId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Quizzes',
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
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  timestamps: true
});

module.exports = QuizQuestion;



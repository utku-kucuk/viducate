const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Quiz = sequelize.define('Quiz', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  passThreshold: {
    type: DataTypes.DECIMAL(4, 2), // 0.00 - 1.00
    defaultValue: 0.70
  },
  timeLimitSec: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  maxAttempts: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  shuffleQuestions: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  shuffleOptions: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isFinal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
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

module.exports = Quiz;



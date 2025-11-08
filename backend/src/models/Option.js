const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Option = sequelize.define('Option', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  questionId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Questions',
      key: 'id'
    }
  }
}, {
  timestamps: true
});

module.exports = Option;



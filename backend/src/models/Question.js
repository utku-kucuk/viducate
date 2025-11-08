const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  imageUrl: {
  type: DataTypes.TEXT,
  allowNull: true
  },
  difficulty: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerId: {
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

module.exports = Question;



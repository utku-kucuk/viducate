const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Log = sequelize.define('Log', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    level: {
        type: DataTypes.ENUM('error', 'warn', 'info', 'debug'),
        defaultValue: 'info',
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    meta: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    context: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true,
    updatedAt: false, // Logs are immutable, only createdAt matters
    indexes: [
        {
            fields: ['level']
        },
        {
            fields: ['createdAt']
        }
    ]
});

module.exports = Log;

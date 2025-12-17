const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemConfig = sequelize.define('SystemConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    isEncrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = SystemConfig;

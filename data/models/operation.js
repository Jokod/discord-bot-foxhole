const Sequelize = require('sequelize');
const database = require('../database.js');

const Operation = database.define('operations', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    operation_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
    },
    owner_id: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    date: Sequelize.STRING,
    time: Sequelize.STRING,
    duration: Sequelize.INTEGER,
    description: Sequelize.STRING,
    status: {
        type: Sequelize.STRING,
        allowNull: false,
    },
});

module.exports = Operation;

const Sequelize = require('sequelize');
const database = require('../../database.js');

const Group = database.define('groups', {
	threadId: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	operation_id: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	materials: {
		type: Sequelize.JSON,
	},
});

module.exports = Group;

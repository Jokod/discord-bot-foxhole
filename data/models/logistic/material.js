const Sequelize = require('sequelize');
const database = require('../../database.js');

const Material = database.define('materials', {
	material_id: {
		type: Sequelize.STRING,
		primaryKey: true,
		allowNull: false,
	},
	operation_id: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	group_id: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	owner_id: {
		type: Sequelize.STRING,
	},
	name: {
		type: Sequelize.STRING(100),
	},
	quantityAsk: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
	},
	quantityGiven: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
	},
	localization: {
		type: Sequelize.STRING(100),
	},
	status: {
		type: Sequelize.STRING,
		allowNull: false,
	},
});

module.exports = Material;

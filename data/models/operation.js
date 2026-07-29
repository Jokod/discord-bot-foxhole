const mongoose = require('mongoose');

const Operation = mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	guild_id: {
		type: String,
		required: true,
	},
	operation_id: {
		type: String,
		required: true,
		unique: true,
	},
	owner_id: {
		type: String,
		required: true,
	},
	numberOfGroups: {
		type: Number,
		required: true,
		default: 0,
	},
	date: String,
	time: String,
	duration: Number,
	description: String,
	status: {
		type: String,
		required: true,
	},
	/** Discord channel hosting the operation message (for cleanup). */
	channel_id: {
		type: String,
		required: false,
	},
});

module.exports = mongoose.model('Operation', Operation);

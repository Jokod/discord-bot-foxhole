const mongoose = require('mongoose');

const Stats = mongoose.Schema({
	guild_id: {
		type: String,
		required: true,
		unique: true,
	},
	name: {
		type: String,
		default: '',
	},
	created_at: {
		type: Date,
		default: null,
	},
	joined_at: {
		type: Date,
		default: null,
	},
	member_count: {
		type: Number,
		default: 0,
	},
	first_command_at: {
		type: Date,
		default: null,
	},
	last_command_at: {
		type: Date,
		default: null,
	},
	command_count: {
		type: Number,
		default: 0,
	},
	last_command_by_type: {
		type: mongoose.Schema.Types.Mixed,
		default: {},
	},
	command_breakdown: {
		type: mongoose.Schema.Types.Mixed,
		default: {},
	},
	operation_count: {
		type: Number,
		default: 0,
	},
	material_count: {
		type: Number,
		default: 0,
	},
	material_validated_count: {
		type: Number,
		default: 0,
	},
});

module.exports = mongoose.model('Stats', Stats);

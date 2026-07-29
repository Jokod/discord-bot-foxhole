const mongoose = require('mongoose');

const Stockpile = mongoose.Schema({
	id: {
		type: String,
		required: true,
	},
	server_id: {
		type: String,
		required: true,
	},
	name: {
		type: String,
		required: true,
	},
	password: {
		type: String,
		required: true,
	},
	region: {
		type: String,
		required: true,
	},
	city: {
		type: String,
		required: true,
	},
	/** Discord channel / thread id hosting this stockpile list */
	channel_id: {
		type: String,
		required: true,
	},
	owner_id: {
		type: String,
		required: true,
	},
	lastResetAt: {
		type: Date,
		required: true,
	},
	expiresAt: {
		type: Date,
		required: true,
	},
	deleted: {
		type: Boolean,
		default: false,
	},
	deletedAt: {
		type: Date,
	},
	expiry_reminders_sent: {
		type: [String],
		default: [],
	},
}, {
	timestamps: true,
});

Stockpile.index({ server_id: 1, channel_id: 1 });
Stockpile.index({ server_id: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('Stockpile', Stockpile);

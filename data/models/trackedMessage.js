const mongoose = require('mongoose');

const TrackedMessage = mongoose.Schema({
	server_id: {
		type: String,
		required: true,
	},
	channel_id: {
		type: String,
		required: true,
	},
	message_type: {
		type: String,
		required: true,
	},
	message_id: {
		type: String,
		required: true,
	},
}, {
	timestamps: true,
});

TrackedMessage.index({ server_id: 1, channel_id: 1, message_type: 1 }, { unique: true });

module.exports = mongoose.model('TrackedMessage', TrackedMessage);

const mongoose = require('mongoose');

const NotificationSubscription = mongoose.Schema({
	guild_id: {
		type: String,
		required: true,
	},
	channel_id: {
		type: String,
		required: true,
	},
	notification_type: {
		type: String,
		required: true,
		enum: ['stockpile_activity', 'stockpile_expiring'],
	},
}, {
	timestamps: true,
});

NotificationSubscription.index({ guild_id: 1, channel_id: 1, notification_type: 1 }, { unique: true });

module.exports = mongoose.model('NotificationSubscription', NotificationSubscription);

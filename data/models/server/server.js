const mongoose = require('mongoose');

const Server = mongoose.Schema({
	guild_id: {
		type: String,
		required: true,
		unique: true,
	},
	lang: {
		type: String,
		required: true,
	},
	camp: {
		type: String,
		required: true,
	},
	/** When true, order boards create a locked Discord Logs thread. Default false. */
	logs: {
		type: Boolean,
		default: false,
	},
});

module.exports = mongoose.model('Server', Server);

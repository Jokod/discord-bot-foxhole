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
});

module.exports = mongoose.model('Server', Server);

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
});

module.exports = mongoose.model('Stockpile', Stockpile);

const mongoose = require('mongoose');

const Group = mongoose.Schema({
	threadId: {
		type: String,
		required: true,
	},
	operation_id: {
		type: String,
		required: true,
	},
	owner_id: {
		type: String,
		required: true,
	},
});

module.exports = mongoose.model('Group', Group);

const mongoose = require('mongoose');

const Material = mongoose.Schema({
	material_id: {
		type: String,
		required: true,
	},
	operation_id: String,
	group_id: String,
	owner_id: String,
	person_id: String,
	name: {
		type: String,
		maxlength: 100,
	},
	quantityAsk: {
		type: Number,
		default: 0,
	},
	quantityGiven: {
		type: Number,
		default: 0,
	},
	localization: {
		type: String,
		maxlength: 100,
	},
	status: {
		type: String,
		required: true,
	},
});

module.exports = mongoose.model('Material', Material);

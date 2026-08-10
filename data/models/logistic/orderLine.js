const mongoose = require('mongoose');

const OrderLine = mongoose.Schema({
	line_id: {
		type: String,
		required: true,
	},
	guild_id: {
		type: String,
		required: true,
	},
	board_id: {
		type: String,
		required: true,
	},
	owner_id: String,
	name: {
		type: String,
		maxlength: 100,
	},
	category: {
		type: String,
		maxlength: 50,
	},
	priority: {
		type: String,
		enum: ['low', 'neutral', 'high'],
		default: 'neutral',
	},
	current: {
		type: Number,
		default: 0,
	},
	target: {
		type: Number,
		default: 0,
	},
});

OrderLine.index({ guild_id: 1, board_id: 1, line_id: 1 }, { unique: true });
OrderLine.index({ guild_id: 1, board_id: 1 });

module.exports = mongoose.model('OrderLine', OrderLine);

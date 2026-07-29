const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema({
	name: String,
	category: String,
}, { _id: false });

const OrderBoard = mongoose.Schema({
	guild_id: {
		type: String,
		required: true,
	},
	name: {
		type: String,
		required: true,
		maxlength: 50,
	},
	channel_id: {
		type: String,
		required: true,
	},
	owner_id: {
		type: String,
		required: true,
	},
	kind: {
		type: String,
		enum: ['prod', 'transfer', 'scrap'],
		required: true,
	},
	operation_id: {
		type: String,
		default: null,
	},
	status: {
		type: String,
		enum: ['open', 'closed'],
		default: 'open',
	},
	page: {
		type: Number,
		default: 0,
	},
	selected_line_id: {
		type: String,
		default: null,
	},
	log_thread_id: {
		type: String,
		default: null,
	},
	next_line_number: {
		type: Number,
		default: 0,
	},
	add_drafts: {
		type: Map,
		of: draftSchema,
		default: () => new Map(),
	},
});

OrderBoard.index({ guild_id: 1, channel_id: 1, name: 1 }, { unique: true });
OrderBoard.index({ guild_id: 1, channel_id: 1 });

module.exports = mongoose.model('OrderBoard', OrderBoard);

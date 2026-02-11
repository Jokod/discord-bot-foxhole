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
	// Utilisé historiquement comme "mot de passe", mais correspond au "code" du stockpile.
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
	// Groupe logique, lié au salon Discord (canal / thread)
	group_id: {
		type: String,
		required: true,
	},
	// Propriétaire du stockpile (créateur)
	owner_id: {
		type: String,
		required: true,
	},
	// Gestion du "timer" de 2 jours
	lastResetAt: {
		type: Date,
		required: true,
	},
	expiresAt: {
		type: Date,
		required: true,
	},
	// Suppression en deux étapes : marquage puis purge
	deleted: {
		type: Boolean,
		default: false,
	},
	deletedAt: {
		type: Date,
	},
	// Rappels d'expiration déjà envoyés : '12h', '6h', '3h', '2h', '1h', '30m'
	expiry_reminders_sent: {
		type: [String],
		default: [],
	},
}, {
	// Ajoute automatiquement createdAt et updatedAt
	timestamps: true,
});

module.exports = mongoose.model('Stockpile', Stockpile);

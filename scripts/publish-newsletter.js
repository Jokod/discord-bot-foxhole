/**
 * Publish data/newsletter.md to every channel subscribed to the newsletter.
 *
 * Usage:
 *   make newsletter publish
 *   make newsletter-publish
 *   node scripts/publish-newsletter.js
 *
 * Requires .env with TOKEN, MONGODB_URL and MONGODB_NAME.
 */
require('dotenv').config();
const dns = require('node:dns');
const { Client, GatewayIntentBits, Events } = require('discord.js');
const mongoose = require('mongoose');
const { broadcastToSubscribers } = require('../utils/notifications.js');
const { NEWSLETTER_FILE, DISCORD_CONTENT_LIMIT, readNewsletterFile } = require('../utils/newsletter.js');

const NEWSLETTER_TYPE = 'newsletter';

const configureDns = () => {
	try {
		dns.setDefaultResultOrder('ipv4first');
	}
	catch {
		// ignore
	}
};

async function main() {
	const result = readNewsletterFile();
	if (result.error === 'missing') {
		console.error(`File not found: ${NEWSLETTER_FILE}`);
		process.exit(1);
	}
	if (result.error === 'empty') {
		console.error(`${NEWSLETTER_FILE} is empty. Edit it, then run again.`);
		process.exit(1);
	}
	if (result.error === 'too_long') {
		console.error(
			`${NEWSLETTER_FILE} is too long (${result.length} characters, max ${DISCORD_CONTENT_LIMIT}).`,
		);
		process.exit(1);
	}

	if (!process.env.TOKEN) {
		console.error('TOKEN is missing in .env');
		process.exit(1);
	}
	if (!process.env.MONGODB_URL) {
		console.error('MONGODB_URL is missing in .env');
		process.exit(1);
	}

	configureDns();

	// Same connection options as bot.js (omit dbName when unset → Mongo default, often "test")
	await mongoose.connect(process.env.MONGODB_URL, {
		dbName: process.env.MONGODB_NAME,
		serverSelectionTimeoutMS: 15000,
	});
	console.log(`Connected to MongoDB (${mongoose.connection.name})`);

	const client = new Client({
		intents: [GatewayIntentBits.Guilds],
	});

	try {
		await new Promise((resolve, reject) => {
			client.once(Events.ClientReady, resolve);
			client.once(Events.Error, reject);
			client.login(process.env.TOKEN).catch(reject);
		});

		console.log(`Logged in as ${client.user.tag}`);
		console.log(`Publishing newsletter (${result.content.length} characters)...`);

		const { sent, total } = await broadcastToSubscribers(client, NEWSLETTER_TYPE, {
			content: result.content,
		});

		if (total === 0) {
			console.log('No channels are subscribed to the newsletter.');
		}
		else {
			console.log(`Newsletter sent to ${sent}/${total} subscribed channel(s).`);
		}
	}
	finally {
		client.destroy();
		await mongoose.disconnect();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

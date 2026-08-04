/**
 * Post a one-shot announcement in each active guild (channels the bot already knows,
 * else system channel / first sendable text channel).
 *
 * YOU run this — never auto-executed by CI or the dashboard.
 *
 *   DASHBOARD_ENV_FILE=.env.prod node scripts/announce-guilds.js --dry-run
 *   DASHBOARD_ENV_FILE=.env.prod node scripts/announce-guilds.js --send
 *
 * Message file (required): data/announce.md
 * Optional: --message-file=./path/to.md · --guild=<id> · --env-file=.env.prod
 *
 * After a run: console summary + data/announce-last-run.txt (SENT/SKIP/FAIL per guild).
 * Exit code 1 if any FAIL.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
	Client,
	GatewayIntentBits,
	PermissionFlagsBits,
	ChannelType,
	Events,
} = require('discord.js');
const mongoose = require('mongoose');
const {
	collectKnownChannels,
	loadAnnounceChannelDocs,
	listDiscordJsCandidateChannels,
} = require('../utils/announceChannels');

const DEFAULT_MESSAGE_FILE = path.join(__dirname, '../data/announce.md');

function parseArgs(argv) {
	const opts = {
		dryRun: argv.includes('--dry-run'),
		send: argv.includes('--send'),
		envFile: null,
		messageFile: DEFAULT_MESSAGE_FILE,
		guildId: null,
	};
	for (const arg of argv) {
		if (arg.startsWith('--env-file=')) opts.envFile = arg.slice('--env-file='.length);
		if (arg.startsWith('--message-file=')) {
			const raw = arg.slice('--message-file='.length);
			opts.messageFile = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
		}
		if (arg.startsWith('--guild=')) opts.guildId = arg.slice('--guild='.length);
	}
	return opts;
}

function loadEnv(envFile) {
	const root = path.join(__dirname, '..');
	const chosen = envFile
		|| process.env.DASHBOARD_ENV_FILE
		|| (fs.existsSync(path.join(root, '.env.prod')) ? '.env.prod' : '.env');
	const full = path.isAbsolute(chosen) ? chosen : path.join(root, chosen);
	require('dotenv').config({ path: full, quiet: true });
	return full;
}

function canSend(channel, me) {
	if (!channel || !channel.isTextBased()) return false;
	if (!me) return channel.isSendable?.() === true;
	const perms = channel.permissionsFor(me);
	return Boolean(
		perms?.has(PermissionFlagsBits.ViewChannel)
		&& perms?.has(PermissionFlagsBits.SendMessages),
	);
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	if (!opts.dryRun && !opts.send) {
		console.error('Usage: node scripts/announce-guilds.js --dry-run | --send');
		console.error('Message: data/announce.md (or --message-file=…)');
		process.exit(1);
	}
	if (opts.dryRun && opts.send) {
		console.error('Use --dry-run OR --send, not both.');
		process.exit(1);
	}

	if (!fs.existsSync(opts.messageFile)) {
		console.error(`Message file not found: ${opts.messageFile}`);
		process.exit(1);
	}
	const message = fs.readFileSync(opts.messageFile, 'utf8').trim();
	if (!message) {
		console.error(`Message file is empty: ${opts.messageFile}`);
		process.exit(1);
	}

	const envPath = loadEnv(opts.envFile);
	const token = process.env.TOKEN;
	const mongoUrl = process.env.MONGODB_URL;
	const dbName = process.env.MONGODB_NAME;
	if (!token || !mongoUrl) {
		console.error('TOKEN and MONGODB_URL required in', envPath);
		process.exit(1);
	}

	console.log(`[announce] env=${path.basename(envPath)} mode=${opts.dryRun ? 'DRY-RUN' : 'SEND'}`);
	console.log(`[announce] message=${opts.messageFile} (${message.length} chars)`);
	await mongoose.connect(mongoUrl, dbName ? { dbName } : undefined);
	const db = mongoose.connection.db;

	const statsFilter = { left_at: null };
	if (opts.guildId) statsFilter.guild_id = opts.guildId;
	const guilds = await db.collection('stats').find(statsFilter).project({
		guild_id: 1, name: 1,
	}).toArray();

	const guildIds = guilds.map((g) => g.guild_id);
	const dbDocs = await loadAnnounceChannelDocs(guildIds);

	const client = new Client({ intents: [GatewayIntentBits.Guilds] });
	await client.login(token);
	await new Promise((resolve) => client.once(Events.ClientReady, resolve));

	let ok = 0;
	let skip = 0;
	let fail = 0;
	const report = [];

	for (const g of guilds) {
		const discordGuild = await client.guilds.fetch(g.guild_id).catch(() => null);
		if (!discordGuild) {
			console.log(`SKIP  ${g.name} (${g.guild_id}) — bot not in guild`);
			report.push({ guild: g.name, guild_id: g.guild_id, status: 'SKIP', detail: 'bot not in guild' });
			skip += 1;
			continue;
		}
		await discordGuild.channels.fetch().catch(() => null);
		const preferred = collectKnownChannels(dbDocs, g.guild_id);
		const candidates = listDiscordJsCandidateChannels(
			discordGuild,
			preferred,
			canSend,
			ChannelType,
		);
		if (!candidates.length) {
			console.log(`SKIP  ${g.name} — no sendable channel`);
			report.push({ guild: g.name, guild_id: g.guild_id, status: 'SKIP', detail: 'no sendable channel' });
			skip += 1;
			continue;
		}

		if (opts.dryRun) {
			const preview = candidates.slice(0, 3).map((c) => `#${c.channel.name}(${c.source})`).join(', ');
			console.log(`DRY   ${g.name} → try ${candidates.length}: ${preview}`);
			report.push({
				guild: g.name,
				guild_id: g.guild_id,
				status: 'DRY',
				detail: preview,
			});
			ok += 1;
			continue;
		}

		let sent = false;
		let lastErr = null;
		for (const { channel, source } of candidates) {
			const label = `#${channel.name} (${channel.id}, via ${source})`;
			try {
				await channel.send({ content: message });
				console.log(`SENT  ${g.name} → ${label}`);
				report.push({
					guild: g.name,
					guild_id: g.guild_id,
					status: 'SENT',
					detail: label,
				});
				ok += 1;
				sent = true;
				break;
			}
			catch (err) {
				lastErr = err.message;
				console.log(`RETRY ${g.name} → ${label}: ${err.message}`);
			}
		}
		if (!sent) {
			console.log(`FAIL  ${g.name} — all candidate channels rejected`);
			report.push({
				guild: g.name,
				guild_id: g.guild_id,
				status: 'FAIL',
				detail: lastErr || 'all channels rejected',
			});
			fail += 1;
		}
	}

	console.log('');
	console.log('[announce] ——— summary ———');
	for (const row of report) {
		console.log(`${row.status.padEnd(4)}  ${row.guild}  ${row.detail}`);
	}
	console.log(`[announce] total=${report.length} sent/dry=${ok} skip=${skip} fail=${fail}`);

	const reportPath = path.join(__dirname, '../data/announce-last-run.txt');
	const lines = [
		`mode=${opts.dryRun ? 'DRY-RUN' : 'SEND'}`,
		`at=${new Date().toISOString()}`,
		`message=${opts.messageFile}`,
		`total=${report.length} ok=${ok} skip=${skip} fail=${fail}`,
		'',
		...report.map((r) => `${r.status}\t${r.guild_id}\t${r.guild}\t${r.detail}`),
		'',
	];
	fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
	console.log(`[announce] report written: ${reportPath}`);

	client.destroy();
	await mongoose.disconnect();
	process.exit(fail ? 1 : 0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

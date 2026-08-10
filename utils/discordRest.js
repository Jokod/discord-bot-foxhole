'use strict';

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function avatarUrl(user) {
	if (!user?.id) return null;
	if (user.avatar) {
		const ext = String(user.avatar).startsWith('a_') ? 'gif' : 'png';
		return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=64`;
	}
	const idx = user.discriminator && user.discriminator !== '0'
		? Number(user.discriminator) % 5
		: Number((BigInt(user.id) >> 22n) % 6n);
	return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

function mapUser(user) {
	if (!user?.id) return null;
	return {
		user_id: user.id,
		username: user.username || null,
		display_name: user.global_name || user.username || user.id,
		avatar_url: avatarUrl(user),
		profile_url: `https://discord.com/users/${user.id}`,
	};
}

/**
 * @param {string} apiPath
 * @param {{ method?: string, body?: object|null, _retry?: number }} [options]
 */
async function discordFetch(apiPath, options = {}) {
	const token = process.env.TOKEN;
	if (!token) return { ok: false, status: 0, data: null, error: 'TOKEN manquant' };

	const method = (options.method || 'GET').toUpperCase();
	const headers = {
		Authorization: `Bot ${token}`,
		'User-Agent': 'FoxBot-Dashboard (local)',
	};
	const init = { method, headers };
	if (options.body != null && method !== 'GET' && method !== 'DELETE') {
		headers['Content-Type'] = 'application/json';
		init.body = JSON.stringify(options.body);
	}

	const res = await fetch(`https://discord.com/api/v10${apiPath}`, init);
	if (res.status === 429) {
		const retry = (options._retry || 0) + 1;
		if (retry > 3) {
			return { ok: false, status: 429, data: null, error: 'rate limited' };
		}
		const body = await res.json().catch(() => ({}));
		const wait = Math.ceil(Number(body.retry_after || 1) * 1000);
		await sleep(Math.min(wait, 5000));
		return discordFetch(apiPath, { ...options, _retry: retry });
	}
	if (res.status === 204) {
		return { ok: true, status: 204, data: null, error: null };
	}
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		return { ok: false, status: res.status, data: null, error: text.slice(0, 200) };
	}
	const text = await res.text().catch(() => '');
	if (!text) return { ok: true, status: res.status, data: null, error: null };
	try {
		return { ok: true, status: res.status, data: JSON.parse(text), error: null };
	}
	catch {
		return { ok: true, status: res.status, data: text, error: null };
	}
}

/** @param {string} guildId */
async function leaveGuildRest(guildId) {
	return discordFetch(`/users/@me/guilds/${guildId}`, { method: 'DELETE' });
}

/** @param {string} channelId @param {string} content */
async function sendChannelMessage(channelId, content) {
	return discordFetch(`/channels/${channelId}/messages`, {
		method: 'POST',
		body: { content },
	});
}

/** @param {string} guildId */
async function fetchGuildChannels(guildId) {
	return discordFetch(`/guilds/${guildId}/channels`);
}

/** @param {string} guildId */
async function fetchGuild(guildId) {
	return discordFetch(`/guilds/${guildId}`);
}

module.exports = {
	sleep,
	avatarUrl,
	mapUser,
	discordFetch,
	leaveGuildRest,
	sendChannelMessage,
	fetchGuildChannels,
	fetchGuild,
};

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

async function discordFetch(apiPath) {
	const token = process.env.TOKEN;
	if (!token) return { ok: false, status: 0, data: null, error: 'TOKEN manquant' };
	const res = await fetch(`https://discord.com/api/v10${apiPath}`, {
		headers: {
			Authorization: `Bot ${token}`,
			'User-Agent': 'FoxBot-Dashboard (local)',
		},
	});
	if (res.status === 429) {
		const body = await res.json().catch(() => ({}));
		const wait = Math.ceil(Number(body.retry_after || 1) * 1000);
		await sleep(Math.min(wait, 5000));
		return discordFetch(apiPath);
	}
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		return { ok: false, status: res.status, data: null, error: text.slice(0, 200) };
	}
	return { ok: true, status: res.status, data: await res.json(), error: null };
}

module.exports = {
	sleep,
	avatarUrl,
	mapUser,
	discordFetch,
};

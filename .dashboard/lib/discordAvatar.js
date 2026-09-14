'use strict';

const { avatarUrl, discordFetch } = require('../../utils/discordRest');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

function isDiscordUserId(id) {
	return typeof id === 'string' && /^\d{17,20}$/.test(id);
}

function proxyAvatarUrl(userId) {
	return isDiscordUserId(userId) ? `/api/avatar/${userId}` : null;
}

function withProxyAvatar(user) {
	if (!user?.user_id) return user;
	return {
		...user,
		avatar_url: user.avatar_url ? proxyAvatarUrl(user.user_id) : null,
	};
}

async function resolveUpstreamAvatarUrl(userId) {
	const res = await discordFetch(`/users/${userId}`);
	if (!res.ok) return null;
	return avatarUrl(res.data);
}

async function fetchAvatarBytes(upstreamUrl) {
	const res = await fetch(upstreamUrl);
	if (!res.ok) return null;
	const body = Buffer.from(await res.arrayBuffer());
	const contentType = res.headers.get('content-type') || 'image/png';
	return { body, contentType };
}

async function serveAvatar(userId, res) {
	if (!isDiscordUserId(userId)) {
		res.writeHead(400, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
		res.end('Bad request');
		return;
	}

	const cached = cache.get(userId);
	if (cached && (Date.now() - cached.at) < CACHE_TTL_MS) {
		res.writeHead(200, {
			'Content-Type': cached.contentType,
			'Cache-Control': 'public, max-age=86400',
			'X-Content-Type-Options': 'nosniff',
		});
		res.end(cached.body);
		return;
	}

	const upstream = await resolveUpstreamAvatarUrl(userId);
	if (!upstream) {
		res.writeHead(404, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
		res.end('Not found');
		return;
	}

	const img = await fetchAvatarBytes(upstream);
	if (!img) {
		res.writeHead(502, { 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
		res.end('Upstream error');
		return;
	}

	cache.set(userId, { at: Date.now(), ...img });
	res.writeHead(200, {
		'Content-Type': img.contentType,
		'Cache-Control': 'public, max-age=86400',
		'X-Content-Type-Options': 'nosniff',
	});
	res.end(img.body);
}

function resetAvatarCacheForTests() {
	cache.clear();
}

module.exports = {
	isDiscordUserId,
	proxyAvatarUrl,
	withProxyAvatar,
	serveAvatar,
	resetAvatarCacheForTests,
};

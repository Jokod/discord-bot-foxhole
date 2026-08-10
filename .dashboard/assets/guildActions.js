'use strict';

(function() {
	'use strict';

	window.Dashboard = window.Dashboard || {};
	const D = window.Dashboard;
	const { t } = window.DashboardI18n;

	function resolveGuild(guildOverride) {
		if (guildOverride?.guild_id) return guildOverride;
		if (!D.selectedGuildId) return null;
		const raw = D.raw?.guilds || [];
		const blocked = D.raw?.blocked_guilds || [];
		return raw.find((g) => g.guild_id === D.selectedGuildId)
			|| blocked.find((g) => g.guild_id === D.selectedGuildId)
			|| { guild_id: D.selectedGuildId, name: D.selectedGuildId };
	}

	function currentGuild() {
		return resolveGuild(D._guildModalGuild);
	}

	function drawerIsOpen() {
		return document.getElementById('drawer')?.classList.contains('open');
	}

	function syncGuildActionsUi() {
		const bar = document.getElementById('guildActionsBar');
		const open = drawerIsOpen() && Boolean(D.selectedGuildId);
		if (bar) bar.hidden = !open;
		if (!open) return;

		const guild = resolveGuild();
		const blocked = Boolean(guild?.blocked || guild?.blocked_source);
		const source = guild?.blocked_source || null;
		const canUnblacklist = source === 'mongo' || source === 'both';

		const blacklistRow = document.querySelector('[data-action-row="blacklist"]');
		const unblacklistRow = document.querySelector('[data-action-row="unblacklist"]');
		if (blacklistRow) blacklistRow.hidden = blocked;
		if (unblacklistRow) {
			unblacklistRow.hidden = !blocked;
			const btn = document.getElementById('guildActUnblacklist');
			if (btn) {
				btn.disabled = blocked && !canUnblacklist;
				btn.title = blocked && !canUnblacklist ? t('guilds.unblacklistEnvOnly') : '';
			}
		}
	}
	D.syncGuildActionsUi = syncGuildActionsUi;

	function closeGuildModal() {
		const modal = document.getElementById('guildModal');
		if (modal) modal.hidden = true;
		D._guildModalAction = null;
		D._guildModalGuild = null;
		const err = document.getElementById('guildModalError');
		const report = document.getElementById('guildModalReport');
		if (err) {
			err.hidden = true;
			err.textContent = '';
		}
		if (report) {
			report.hidden = true;
			report.textContent = '';
		}
		const submit = document.getElementById('guildModalSubmit');
		if (submit) submit.disabled = false;
	}

	function actionHint(action) {
		const hints = {
			leave: t('guilds.actLeaveHint'),
			blacklist: t('guilds.actBlacklistHint'),
			unblacklist: t('guilds.actUnblacklistHint'),
			broadcast: t('guilds.actBroadcastHint'),
		};
		return hints[action] || t('guilds.modalSub');
	}

	function openGuildModal(action, guildOverride = null) {
		const guild = resolveGuild(guildOverride);
		if (!guild) return;
		if (action === 'unblacklist' && guild.blocked_source === 'env') {
			return;
		}
		D._guildModalAction = action;
		D._guildModalGuild = guild;
		D.selectedGuildId = guild.guild_id;

		const modal = document.getElementById('guildModal');
		const title = document.getElementById('guildModalTitle');
		const sub = document.getElementById('guildModalSub');
		const list = document.getElementById('guildModalList');
		const broadcast = document.getElementById('guildModalBroadcast');
		const confirmWrap = document.getElementById('guildModalConfirmWrap');
		const confirmInput = document.getElementById('guildConfirmInput');
		const submit = document.getElementById('guildModalSubmit');
		const err = document.getElementById('guildModalError');
		const report = document.getElementById('guildModalReport');

		const titles = {
			leave: t('guilds.modalLeaveTitle'),
			blacklist: t('guilds.modalBlacklistTitle'),
			unblacklist: t('guilds.modalUnblacklistTitle'),
			broadcast: t('guilds.modalBroadcastTitle'),
		};
		title.textContent = titles[action] || action;
		sub.textContent = actionHint(action);
		const src = guild.blocked_source ? ` · ${D.escapeHtml(guild.blocked_source)}` : '';
		const blocked = guild.blocked || guild.blocked_source
			? ` <span class="badge blocked">${t('guilds.blocked')}</span>`
			: '';
		list.innerHTML = `<li><strong>${D.escapeHtml(guild.name)}</strong>${blocked}<br /><span class="mono muted">${D.escapeHtml(guild.guild_id)}${src}</span></li>`;

		const needsConfirm = action === 'leave' || action === 'blacklist' || action === 'unblacklist';
		confirmWrap.hidden = !needsConfirm;
		if (confirmInput) confirmInput.value = '';
		broadcast.hidden = action !== 'broadcast';
		if (action === 'broadcast') {
			document.getElementById('guildBroadcastDry').checked = true;
			document.getElementById('guildBroadcastMsg').value = '';
		}
		err.hidden = true;
		report.hidden = true;
		submit.disabled = false;
		submit.classList.toggle('danger', action === 'leave' || action === 'blacklist');
		submit.textContent = action === 'broadcast' ? t('guilds.modalSubmitBroadcast') : t('guilds.modalConfirm');
		modal.hidden = false;
		if (needsConfirm) confirmInput?.focus();
		else if (action === 'broadcast') document.getElementById('guildBroadcastMsg')?.focus();
	}
	D.openGuildModal = openGuildModal;

	function formatReport(results) {
		return (results || []).map((r) => {
			const name = r.name || r.guild_id;
			return `${String(r.status).toUpperCase().padEnd(4)}  ${name}  ${r.detail || ''}`;
		}).join('\n');
	}

	async function runGuildModal() {
		const action = D._guildModalAction;
		const guild = currentGuild();
		const err = document.getElementById('guildModalError');
		const report = document.getElementById('guildModalReport');
		const submit = document.getElementById('guildModalSubmit');
		err.hidden = true;
		report.hidden = true;

		if (!action || !guild) return;

		if (action === 'leave' || action === 'blacklist' || action === 'unblacklist') {
			const typed = (document.getElementById('guildConfirmInput')?.value || '').trim();
			if (typed !== 'CONFIRM') {
				err.textContent = t('guilds.confirmNeeded');
				err.hidden = false;
				return;
			}
		}

		const guild_ids = [guild.guild_id];
		const path = `/api/guilds/${action}`;
		let body = { guild_ids };

		if (action === 'broadcast') {
			const message = document.getElementById('guildBroadcastMsg')?.value || '';
			const dry_run = Boolean(document.getElementById('guildBroadcastDry')?.checked);
			body = { guild_ids, message, dry_run };
		}

		submit.disabled = true;
		try {
			const data = await D.api(path, {
				method: 'POST',
				body: JSON.stringify(body),
			});
			report.textContent = formatReport(data.results);
			report.hidden = false;
			await D.load?.(true);
			syncGuildActionsUi();
		}
		catch (e) {
			err.textContent = e.message || t('error.generic', { msg: 'failed' });
			err.hidden = false;
		}
		finally {
			submit.disabled = false;
		}
	}

	function bindGuildActions() {
		document.getElementById('guildActLeave')?.addEventListener('click', () => openGuildModal('leave'));
		document.getElementById('guildActBlacklist')?.addEventListener('click', () => openGuildModal('blacklist'));
		document.getElementById('guildActUnblacklist')?.addEventListener('click', () => openGuildModal('unblacklist'));
		document.getElementById('guildActBroadcast')?.addEventListener('click', () => openGuildModal('broadcast'));
		document.getElementById('guildModalCancel')?.addEventListener('click', () => closeGuildModal());
		document.getElementById('guildModalSubmit')?.addEventListener('click', () => runGuildModal());
		document.getElementById('guildModal')?.addEventListener('click', (e) => {
			if (e.target.id === 'guildModal') closeGuildModal();
		});

		document.getElementById('blocked')?.addEventListener('click', (e) => {
			const btn = e.target.closest('[data-unblacklist]');
			if (!btn || btn.disabled) return;
			const guildId = btn.getAttribute('data-unblacklist');
			const entry = (D.raw?.blocked_guilds || []).find((g) => g.guild_id === guildId);
			if (!entry) return;
			openGuildModal('unblacklist', {
				guild_id: entry.guild_id,
				name: entry.name,
				blocked: true,
				blocked_source: entry.source,
			});
		});
	}

	D.bindGuildActions = bindGuildActions;
})();

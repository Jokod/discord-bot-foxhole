'use strict';

(function() {
	'use strict';

	window.Dashboard = window.Dashboard || {};

	const { t } = window.DashboardI18n;

	function getStore() {
		return window.Dashboard;
	}

	function personCell(user, extra = '') {
		const { escapeHtml } = getStore();
		if (!user?.user_id) return '<span class="muted">—</span>';
		const name = escapeHtml(user.display_name || user.username || user.user_id);
		const uname = user.username ? `<span class="mono muted">@${escapeHtml(user.username)}</span>` : '';
		const img = user.avatar_url
			? `<img src="${escapeHtml(user.avatar_url)}" alt="" loading="lazy" width="28" height="28" />`
			: '';
		return `<div class="person">${img}<div class="who"><strong><a href="${escapeHtml(user.profile_url)}" target="_blank" rel="noopener">${name}</a></strong>${uname}${extra}</div></div>`;
	}

	function roleBadge(role) {
		const map = {
			owner: ['info', t('contacts.owner')],
			creator: ['warn', t('contacts.creator')],
		};
		const [cls, label] = map[role] || ['info', role];
		return `<span class="badge ${cls}">${label}</span>`;
	}

	function renderContacts() {
		const {
			contactsLoading, contactsData, state, fmt, escapeHtml,
		} = getStore();
		const meta = document.getElementById('contactsMeta');
		if (contactsLoading) {
			meta.textContent = t('contacts.metaLoading');
			return;
		}
		if (!contactsData) {
			meta.textContent = t('contacts.metaIdle');
			return;
		}
		const k = contactsData.kpis || {};
		meta.innerHTML = contactsData.discord_token
			? `${fmt.n(k.active_guilds)} ${t('contacts.active')} · ${fmt.n(k.left_guilds)} ${t('contacts.left')} · ${fmt.n(k.with_owner)} ${t('contacts.owner')} · ${fmt.n(k.unique_people)} · ${fmt.dt(contactsData.generated_at)}`
			: `<span class="error">${t('contacts.noToken')}</span>`;

		const q = state.contactSearch.trim().toLowerCase();
		const guildsPanel = document.getElementById('contactsGuildsPanel');
		const peoplePanel = document.getElementById('contactsPeoplePanel');
		const byPeople = state.contactView === 'people';
		guildsPanel.hidden = byPeople;
		peoplePanel.hidden = !byPeople;

		if (!byPeople) {
			const guilds = (contactsData.guilds || []).filter((g) => {
				if (!q) return true;
				const blob = [
					g.name, g.guild_id, g.active ? t('contacts.active') : t('contacts.left'),
					g.owner?.display_name, g.owner?.username, g.owner?.user_id,
					...(g.creators || []).flatMap((c) => [c.display_name, c.username, c.user_id]),
				].filter(Boolean).join(' ').toLowerCase();
				return blob.includes(q);
			});
			document.getElementById('contactsGuilds').innerHTML = guilds.length ? guilds.map((g) => {
				const creators = (g.creators || []).slice(0, 4).map((c) => {
					const bits = [];
					if (c.stockpiles) bits.push(`${c.stockpiles} stock`);
					if (c.operations) bits.push(`${c.operations} ops`);
					if (c.boards) bits.push(`${c.boards} boards`);
					return personCell(c, bits.length ? `<div class="muted" style="font-size:.72rem">${escapeHtml(bits.join(' · '))}</div>` : '');
				}).join('') || '<span class="muted">—</span>';
				const status = g.active
					? `<span class="badge ok">${t('contacts.active')}</span>`
					: `<span class="badge warn">${t('contacts.left')}</span><div class="muted" style="font-size:.72rem;margin-top:.15rem">${fmt.dt(g.left_at)}</div>`;
				return `<tr>
				<td>
					<strong>${escapeHtml(g.name)}</strong><br />
					<span class="mono muted">${g.guild_id}</span>
					<div class="muted" style="font-size:.78rem;margin-top:.15rem">${t('contacts.membersJoin', { n: fmt.n(g.member_count), date: fmt.dt(g.joined_at) })}</div>
				</td>
				<td>${status}</td>
				<td>${personCell(g.owner)}</td>
				<td><div style="display:grid;gap:.45rem">${creators}</div></td>
				<td class="mono">${fmt.n(g.command_count)}</td>
			</tr>`;
			}).join('') : `<tr><td colspan="5" class="muted">${t('contacts.emptyGuilds')}</td></tr>`;
			return;
		}

		const people = (contactsData.people || []).filter((p) => {
			if (!q) return true;
			const blob = [
				p.display_name, p.username, p.user_id,
				...(p.guilds || []).flatMap((g) => [g.name, g.guild_id, g.role]),
			].filter(Boolean).join(' ').toLowerCase();
			return blob.includes(q);
		});
		document.getElementById('contactsPeople').innerHTML = people.length ? people.map((p) => `
		<tr>
			<td>${personCell(p)}</td>
			<td><div class="contact-roles">${(p.roles || []).map(roleBadge).join('')}</div></td>
			<td>
				<div class="chips">${(p.guilds || []).map((g) =>
		`<span class="chip" title="${escapeHtml(g.role)}${g.active === false ? ` · ${t('contacts.left')}` : ''}">${escapeHtml(g.name.slice(0, 24))}${g.active === false ? ' ✕' : ''}</span>`).join('')}</div>
				<div class="muted" style="font-size:.75rem;margin-top:.25rem">${t('contacts.serversCount', { n: fmt.n(p.guild_count) })}</div>
			</td>
			<td>
				<button type="button" class="copy-id" data-copy="${escapeHtml(p.user_id)}" title="${escapeHtml(t('contacts.copy'))}">${escapeHtml(p.user_id)}</button>
				<div><a class="mono" href="${escapeHtml(p.profile_url)}" target="_blank" rel="noopener">${escapeHtml(t('contacts.profile'))}</a></div>
			</td>
		</tr>`).join('') : `<tr><td colspan="4" class="muted">${t('contacts.emptyPeople')}</td></tr>`;
	}

	async function loadContacts(force = false) {
		const store = getStore();
		store.contactsLoading = true;
		renderContacts();
		try {
			store.contactsData = await store.api(`/api/contacts${force ? '?force=1' : ''}`);
		}
		catch (err) {
			if (err.status === 401) return;
			document.getElementById('contactsMeta').innerHTML =
			`<span class="error">${store.escapeHtml(t('error.contacts', { msg: err.message }))}</span>`;
			store.contactsLoading = false;
			return;
		}
		store.contactsLoading = false;
		renderContacts();
	}

	Object.assign(window.Dashboard, {
		personCell,
		roleBadge,
		renderContacts,
		loadContacts,
	});
})();

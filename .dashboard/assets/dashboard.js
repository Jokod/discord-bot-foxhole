const palette = ['#b4451a', '#2f6b4f', '#3d5a80', '#9a6b12', '#6b4f2f', '#8f3412', '#4a7c6f', '#c47a3a', '#5c564c', '#2c3e50', '#7a5c3a', '#1f6f8b'];
const charts = {};
let raw = null;
let contactsData = null;
let contactsLoading = false;
let autoRefresh = true;
let timer = null;
let sortKey = 'command_count';
let sortDir = 'desc';
let cmdSortKey = 'total';
let cmdSortDir = 'desc';
let selectedGuildId = null;

const state = {
	search: '',
	setup: 'all',
	activity: 'all',
	minCmds: 0,
	command: '',
	leftSearch: '',
	leftSort: 'left_at',
	contactSearch: '',
	contactView: 'guilds',
};

const fmt = {
	n: (v) => new Intl.NumberFormat('fr-FR').format(v ?? 0),
	pct: (v) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v ?? 0)} %`,
	dt: (v) => {
		if (!v) return '—';
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
	},
	rel: (v) => {
		if (!v) return 'jamais';
		const m = Math.floor((Date.now() - new Date(v).getTime()) / 60000);
		if (m < 60) return `${m} min`;
		const h = Math.floor(m / 60);
		if (h < 48) return `${h} h`;
		return `${Math.floor(h / 24)} j`;
	},
};

function escapeHtml(s) {
	return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function setEmpty(canvasId, empty) {
	const el = document.getElementById(`empty-${canvasId}`);
	if (el) el.hidden = !empty;
	const canvas = document.getElementById(canvasId);
	if (canvas) canvas.style.opacity = empty ? '0' : '1';
}

function destroyChart(id) {
	if (!charts[id]) return;
	charts[id].destroy();
	delete charts[id];
}

function barOpts(horizontal = false) {
	return {
		responsive: true,
		maintainAspectRatio: false,
		indexAxis: horizontal ? 'y' : 'x',
		plugins: { legend: { display: false } },
		scales: {
			x: { beginAtZero: true, ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.05)' } },
			y: { beginAtZero: true, ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.05)' } },
		},
		onClick: null,
	};
}

function doughnutOpts() {
	return {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
		},
	};
}

function makeChart(id, config, empty = false) {
	destroyChart(id);
	setEmpty(id, empty);
	if (empty) return;
	const el = document.getElementById(id);
	if (!el) return;
	charts[id] = new Chart(el, config);
}

function series(items, nameKey = 'name', valueKey = 'total') {
	const list = items || [];
	const values = list.map((x) => Number(x[valueKey]) || 0);
	return {
		labels: list.map((x) => x[nameKey]),
		values,
		empty: !list.length || values.every((v) => v <= 0),
	};
}

function renderKpis(data) {
	const k = data.kpis;
	const items = [
		['Actifs', k.active_guilds, `${k.total_seen_guilds} vus`],
		['Setup', k.setup_servers, fmt.pct(k.setup_rate_pct)],
		['Sans setup', k.pending_setup, ''],
		['Partis', k.left_guilds, ''],
		['Commandes', k.total_commands, `moy ${fmt.n(k.avg_commands_per_active)}`],
		['Engagés 7j', k.engaged_7d, fmt.pct(k.engagement_7d_pct)],
		['Membres', k.total_members_active, `moy ${fmt.n(k.avg_members)}`],
		['Boards', k.orderboards, `${fmt.n(k.orderboards_open)} open`],
		['Lines', k.orderlines, fmt.pct(data.product.orderline_progress.pct)],
		['Stockpiles', k.stockpiles, `${fmt.n(k.total_stock_boards)} boards`],
		['Ops docs', k.operations_docs, `${fmt.n(k.total_operations)} stats`],
		['Notifs', k.notifications, `${fmt.n(k.tracked_messages)} msgs`],
	];
	document.getElementById('kpis').innerHTML = items.map(([label, value, hint]) => `
		<div class="kpi"><span class="label">${label}</span><span class="value">${fmt.n(value)}</span>
		${hint ? `<span class="hint">${hint}</span>` : ''}</div>`).join('');
}

function renderOverviewCharts(data) {
	const act = series(data.activity.buckets);
	makeChart('chartActivity', {
		type: 'bar',
		data: { labels: act.labels, datasets: [{ data: act.values, backgroundColor: '#3d5a80', borderRadius: 6 }] },
		options: barOpts(),
	}, act.empty);

	makeChart('chartJoins', {
		type: 'line',
		data: {
			labels: data.activity.joins_by_month.map((m) => m.month),
			datasets: [
				{ label: 'Joins', data: data.activity.joins_by_month.map((m) => m.count), borderColor: '#2f6b4f', backgroundColor: 'rgba(47,107,79,.12)', fill: true, tension: 0.3 },
				{ label: 'Leaves', data: data.activity.leaves_by_month.map((m) => m.count), borderColor: '#b4451a', backgroundColor: 'rgba(180,69,26,.10)', fill: true, tension: 0.3 },
			],
		},
		options: {
			responsive: true, maintainAspectRatio: false,
			plugins: { legend: { position: 'bottom' } },
			scales: {
				x: { ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' } },
				y: { beginAtZero: true, ticks: { font: { family: 'JetBrains Mono', size: 10 } }, grid: { color: 'rgba(0,0,0,.06)' } },
			},
		},
	}, false);

	const mem = series(data.members.distribution);
	makeChart('chartMembers', {
		type: 'bar',
		data: { labels: mem.labels, datasets: [{ data: mem.values, backgroundColor: '#2f6b4f', borderRadius: 6 }] },
		options: barOpts(),
	}, mem.empty);

	const cmds = (data.commands || []).slice(0, 8);
	const cmdSeries = series(cmds);
	makeChart('chartTopCmdsMini', {
		type: 'bar',
		data: {
			labels: cmds.map((c) => `/${c.name}`),
			datasets: [{ data: cmds.map((c) => c.total), backgroundColor: cmds.map((_, i) => palette[i % palette.length]), borderRadius: 6 }],
		},
		options: {
			...barOpts(true),
			onClick: (_e, els) => {
				if (!els.length) return;
				const cmd = cmds[els[0].index]?.name;
				if (!cmd) return;
				state.command = cmd;
				document.getElementById('fCommand').value = cmd;
				switchView('guilds');
				renderGuilds();
			},
		},
	}, cmdSeries.empty);

	makeChart('chartSetup', {
		type: 'doughnut',
		data: {
			labels: ['Setup', 'Sans setup', 'Engagés 7j', 'Inactifs 7j'],
			datasets: [{
				data: [
					data.kpis.setup_servers,
					data.kpis.pending_setup,
					data.kpis.engaged_7d,
					Math.max(0, data.kpis.active_guilds - data.kpis.engaged_7d),
				],
				backgroundColor: ['#2f6b4f', '#9a6b12', '#3d5a80', '#c9c1b2'],
			}],
		},
		options: doughnutOpts(),
	}, false);

	const topCmds = data.top.by_commands.slice(0, 10);
	makeChart('chartTopCmds', {
		type: 'bar',
		data: {
			labels: topCmds.map((g) => g.name.slice(0, 22)),
			datasets: [{ data: topCmds.map((g) => g.command_count), backgroundColor: '#b4451a', borderRadius: 6 }],
		},
		options: {
			...barOpts(true),
			onClick: (_e, els) => {
				if (!els.length) return;
				openDrawer(topCmds[els[0].index]);
			},
		},
	}, !topCmds.length);

	const topMem = data.top.by_members.slice(0, 10);
	makeChart('chartTopMembers', {
		type: 'bar',
		data: {
			labels: topMem.map((g) => g.name.slice(0, 22)),
			datasets: [{ data: topMem.map((g) => g.member_count), backgroundColor: '#2f6b4f', borderRadius: 6 }],
		},
		options: {
			...barOpts(true),
			onClick: (_e, els) => {
				if (!els.length) return;
				openDrawer(topMem[els[0].index]);
			},
		},
	}, !topMem.length);
}

function renderCommandCharts(data) {
	const cmds = data.commands || [];
	document.getElementById('cmdCloud').innerHTML = cmds.map((c) => `
		<button type="button" class="chip-btn ${state.command === c.name ? 'active' : ''}" data-cmd="${escapeHtml(c.name)}">/${escapeHtml(c.name)} · ${fmt.n(c.total)}</button>
	`).join('');

	makeChart('chartCommands', {
		type: 'bar',
		data: {
			labels: cmds.map((c) => `/${c.name}`),
			datasets: [{ data: cmds.map((c) => c.total), backgroundColor: cmds.map((c, i) => state.command === c.name ? '#1c1914' : palette[i % palette.length]), borderRadius: 6 }],
		},
		options: {
			...barOpts(true),
			onClick: (_e, els) => {
				if (!els.length) return;
				const name = cmds[els[0].index]?.name;
				state.command = state.command === name ? '' : name;
				document.getElementById('fCommand').value = state.command;
				renderCommandCharts(raw);
				renderGuilds();
			},
		},
	}, !cmds.length);

	makeChart('chartCommandsPie', {
		type: 'doughnut',
		data: {
			labels: cmds.map((c) => `/${c.name}`),
			datasets: [{ data: cmds.map((c) => c.total), backgroundColor: cmds.map((_, i) => palette[i % palette.length]) }],
		},
		options: {
			...doughnutOpts(),
			plugins: {
				...doughnutOpts().plugins,
				tooltip: {
					callbacks: {
						label: (ctx) => {
							const c = cmds[ctx.dataIndex];
							return c ? ` /${c.name}: ${fmt.n(c.total)} (${fmt.pct(c.pct)})` : '';
						},
					},
				},
			},
			onClick: (_e, els) => {
				if (!els.length) return;
				const name = cmds[els[0].index]?.name;
				state.command = state.command === name ? '' : name;
				document.getElementById('fCommand').value = state.command;
				renderCommandCharts(raw);
				renderGuilds();
			},
		},
	}, !cmds.length);

	const sorted = [...cmds].sort((a, b) => {
		const av = a[cmdSortKey]; const bv = b[cmdSortKey];
		if (typeof av === 'string') return cmdSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
		return cmdSortDir === 'asc' ? av - bv : bv - av;
	});
	document.getElementById('cmdTable').innerHTML = sorted.map((c) => `
		<tr class="row-click" data-cmd="${escapeHtml(c.name)}">
			<td class="mono">/${escapeHtml(c.name)}</td>
			<td class="mono">${fmt.n(c.total)}</td>
			<td class="mono">${fmt.pct(c.pct)}</td>
		</tr>`).join('');
}

function renderProductCharts(data) {
	const p = data.product;
	const kind = series(p.orderboards_by_kind);
	makeChart('chartBoardKind', {
		type: 'doughnut',
		data: { labels: kind.labels, datasets: [{ data: kind.values, backgroundColor: kind.labels.map((_, i) => palette[i % palette.length]) }] },
		options: doughnutOpts(),
	}, kind.empty);

	const status = series(p.orderboards_by_status);
	makeChart('chartBoardStatus', {
		type: 'doughnut',
		data: { labels: status.labels, datasets: [{ data: status.values, backgroundColor: ['#2f6b4f', '#9a6b12', '#b4451a', '#3d5a80'] }] },
		options: doughnutOpts(),
	}, status.empty);

	const prio = series(p.orderlines_by_priority);
	makeChart('chartLinePrio', {
		type: 'doughnut',
		data: { labels: prio.labels, datasets: [{ data: prio.values, backgroundColor: ['#b4451a', '#9a6b12', '#2f6b4f', '#3d5a80'] }] },
		options: doughnutOpts(),
	}, prio.empty);

	const prog = p.orderline_progress || {};
	document.getElementById('lineProgressHint').textContent =
		`${fmt.n(prog.current)} / ${fmt.n(prog.target)} (${fmt.pct(prog.pct)}) · ${fmt.n(prog.complete)}/${fmt.n(prog.total)} complètes`;
	const remain = Math.max(0, (prog.target || 0) - (prog.current || 0));
	makeChart('chartLineProgress', {
		type: 'doughnut',
		data: {
			labels: ['Livré', 'Restant'],
			datasets: [{ data: [prog.current || 0, remain], backgroundColor: ['#2f6b4f', '#c9c1b2'] }],
		},
		options: doughnutOpts(),
	}, !(prog.target || prog.current));

	const lang = series(p.servers_by_lang);
	makeChart('chartLang', {
		type: 'doughnut',
		data: { labels: lang.labels, datasets: [{ data: lang.values, backgroundColor: lang.labels.map((_, i) => palette[i % palette.length]) }] },
		options: doughnutOpts(),
	}, lang.empty);

	const camp = series(p.servers_by_camp);
	makeChart('chartCamp', {
		type: 'doughnut',
		data: { labels: camp.labels, datasets: [{ data: camp.values, backgroundColor: ['#2f6b4f', '#3d5a80', '#9a6b12'] }] },
		options: doughnutOpts(),
	}, camp.empty);

	const notif = series(p.notifications_by_type);
	makeChart('chartNotif', {
		type: 'bar',
		data: { labels: notif.labels, datasets: [{ data: notif.values, backgroundColor: '#3d5a80', borderRadius: 6 }] },
		options: barOpts(),
	}, notif.empty);

	const ops = series(p.operations_by_status);
	makeChart('chartOps', {
		type: 'bar',
		data: { labels: ops.labels, datasets: [{ data: ops.values, backgroundColor: '#b4451a', borderRadius: 6 }] },
		options: barOpts(),
	}, ops.empty);
}

function filteredGuilds() {
	const q = state.search.trim().toLowerCase();
	return (raw?.guilds || []).filter((g) => {
		if (state.setup === 'yes' && !g.setup) return false;
		if (state.setup === 'no' && g.setup) return false;
		if (state.activity !== 'all' && g.activity !== state.activity) return false;
		if ((g.command_count || 0) < state.minCmds) return false;
		if (state.command) {
			const count = g.command_breakdown?.[state.command] || 0;
			if (!(count > 0)) return false;
		}
		if (q && !(`${g.name} ${g.guild_id}`).toLowerCase().includes(q)) return false;
		return true;
	}).sort((a, b) => {
		let av = a[sortKey];
		let bv = b[sortKey];
		if (sortKey === 'setup') {
			av = a.setup ? 1 : 0;
			bv = b.setup ? 1 : 0;
		}
		if (sortKey === 'lang' || sortKey === 'camp') {
			av = a[sortKey] || '';
			bv = b[sortKey] || '';
		}
		if (sortKey === 'last_command_at' || sortKey === 'joined_at') {
			av = av ? new Date(av).getTime() : 0;
			bv = bv ? new Date(bv).getTime() : 0;
		}
		if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
		return sortDir === 'asc' ? (av - bv) : (bv - av);
	});
}

function renderGuilds() {
	if (!raw) return;
	const guilds = filteredGuilds();
	document.getElementById('guildCount').textContent = `${fmt.n(guilds.length)} / ${fmt.n(raw.guilds.length)} serveurs`;
	const af = document.getElementById('activeFilter');
	if (state.command) {
		af.hidden = false;
		af.textContent = `filtre /${state.command}`;
	}
	else {af.hidden = true;}

	document.querySelectorAll('th[data-sort]').forEach((th) => {
		const key = th.dataset.sort;
		const on = key === sortKey;
		th.classList.toggle('sorted', on);
		const arrow = th.querySelector('.arrow');
		if (arrow) arrow.remove();
		if (on) {
			const s = document.createElement('span');
			s.className = 'arrow';
			s.textContent = sortDir === 'asc' ? '▲' : '▼';
			th.appendChild(s);
		}
	});

	document.getElementById('guilds').innerHTML = guilds.length ? guilds.map((g) => `
		<tr class="row-click" data-gid="${g.guild_id}">
			<td>
				<strong>${escapeHtml(g.name)}</strong><br />
				<span class="mono muted">${g.guild_id}</span>
			</td>
			<td><span class="badge ${g.setup ? 'ok' : 'warn'}">${g.setup ? 'oui' : 'non'}</span></td>
			<td class="mono">${g.lang ? escapeHtml(g.lang) : '<span class="muted">—</span>'}</td>
			<td class="mono">${fmt.n(g.command_count)}</td>
			<td class="mono">${fmt.n(g.member_count)}</td>
			<td class="mono">${fmt.n(g.operation_count)}</td>
			<td class="mono">${fmt.n(g.stock_board_count)}</td>
			<td class="mono" title="${fmt.dt(g.last_command_at)}"><span class="badge info">${escapeHtml(g.activity)}</span> ${fmt.rel(g.last_command_at)}</td>
			<td><div class="chips">${(g.top_commands || []).slice(0, 3).map((c) => `<span class="chip ${state.command === c.name ? 'active' : ''}" data-cmd="${escapeHtml(c.name)}">/${escapeHtml(c.name)} ${c.count}</span>`).join('') || '—'}</div></td>
		</tr>`).join('') : '<tr><td colspan="9" class="muted">Aucun serveur pour ces filtres.</td></tr>';

	const lq = state.leftSearch.trim().toLowerCase();
	let left = (raw.left_guilds || []).filter((g) => !lq || (`${g.name} ${g.guild_id}`).toLowerCase().includes(lq));
	left = [...left].sort((a, b) => {
		if (state.leftSort === 'name') return a.name.localeCompare(b.name);
		if (state.leftSort === 'command_count') return b.command_count - a.command_count;
		return new Date(b.left_at || 0) - new Date(a.left_at || 0);
	});
	document.getElementById('left').innerHTML = left.length ? left.map((g) => `
		<tr>
			<td><strong>${escapeHtml(g.name)}</strong><br /><span class="mono muted">${g.guild_id}</span></td>
			<td class="mono">${fmt.n(g.command_count)}</td>
			<td class="mono">${fmt.dt(g.left_at)}</td>
		</tr>`).join('') : '<tr><td colspan="3" class="muted">Aucun départ.</td></tr>';
}

function personCell(user, extra = '') {
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
		owner: ['info', 'owner'],
		creator: ['warn', 'créateur'],
	};
	const [cls, label] = map[role] || ['info', role];
	return `<span class="badge ${cls}">${label}</span>`;
}

function renderContacts() {
	const meta = document.getElementById('contactsMeta');
	if (contactsLoading) {
		meta.textContent = 'Chargement Discord…';
		return;
	}
	if (!contactsData) {
		meta.textContent = 'Ouvre cet onglet pour charger les contacts…';
		return;
	}
	const k = contactsData.kpis || {};
	meta.innerHTML = contactsData.discord_token
		? `${fmt.n(k.active_guilds)} actifs · ${fmt.n(k.left_guilds)} retirés · ${fmt.n(k.with_owner)} owners · ${fmt.n(k.unique_people)} personnes · ${fmt.dt(contactsData.generated_at)}`
		: '<span class="error">TOKEN Discord absent — IDs seulement</span>';

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
				g.name, g.guild_id, g.active ? 'actif' : 'retiré',
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
				? '<span class="badge ok">actif</span>'
				: `<span class="badge warn">retiré</span><div class="muted" style="font-size:.72rem;margin-top:.15rem">${fmt.dt(g.left_at)}</div>`;
			return `<tr>
				<td>
					<strong>${escapeHtml(g.name)}</strong><br />
					<span class="mono muted">${g.guild_id}</span>
					<div class="muted" style="font-size:.78rem;margin-top:.15rem">${fmt.n(g.member_count)} membres · join ${fmt.dt(g.joined_at)}</div>
				</td>
				<td>${status}</td>
				<td>${personCell(g.owner)}</td>
				<td><div style="display:grid;gap:.45rem">${creators}</div></td>
				<td class="mono">${fmt.n(g.command_count)}</td>
			</tr>`;
		}).join('') : '<tr><td colspan="5" class="muted">Aucun contact pour cette recherche.</td></tr>';
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
		`<span class="chip" title="${escapeHtml(g.role)}${g.active === false ? ' · retiré' : ''}">${escapeHtml(g.name.slice(0, 24))}${g.active === false ? ' ✕' : ''}</span>`).join('')}</div>
				<div class="muted" style="font-size:.75rem;margin-top:.25rem">${fmt.n(p.guild_count)} serveur(s)</div>
			</td>
			<td>
				<button type="button" class="copy-id" data-copy="${escapeHtml(p.user_id)}" title="Copier">${escapeHtml(p.user_id)}</button>
				<div><a class="mono" href="${escapeHtml(p.profile_url)}" target="_blank" rel="noopener">profil</a></div>
			</td>
		</tr>`).join('') : '<tr><td colspan="4" class="muted">Aucune personne pour cette recherche.</td></tr>';
}

async function loadContacts(force = false) {
	contactsLoading = true;
	renderContacts();
	try {
		const res = await fetch(`/api/contacts${force ? '?force=1' : ''}`);
		const data = await res.json();
		if (!res.ok) throw new Error(data.error || res.statusText);
		contactsData = data;
	}
	catch (err) {
		document.getElementById('contactsMeta').innerHTML =
			`<span class="error">Erreur contacts : ${escapeHtml(err.message)}</span>`;
		contactsLoading = false;
		return;
	}
	contactsLoading = false;
	renderContacts();
}

function openDrawer(g) {
	if (!g) return;
	selectedGuildId = g.guild_id;
	document.getElementById('drawerBody').innerHTML = `
		<h3>${escapeHtml(g.name)}</h3>
		<p class="mono muted">${g.guild_id}</p>
		<div class="stat-list">
			<div><span>Setup</span><strong>${g.setup ? 'oui' : 'non'}</strong></div>
			<div><span>Langue</span><strong>${g.lang ? escapeHtml(g.lang) : '—'}</strong></div>
			<div><span>Camp</span><strong>${g.camp ? escapeHtml(g.camp) : '—'}</strong></div>
			<div><span>Membres</span><strong>${fmt.n(g.member_count)}</strong></div>
			<div><span>Commandes</span><strong>${fmt.n(g.command_count)}</strong></div>
			<div><span>Ops</span><strong>${fmt.n(g.operation_count)}</strong></div>
			<div><span>Stock boards</span><strong>${fmt.n(g.stock_board_count)}</strong></div>
			<div><span>Cmd / membre</span><strong>${fmt.n(g.cmds_per_member)}</strong></div>
			<div><span>Joined</span><strong>${fmt.dt(g.joined_at)}</strong></div>
			<div><span>First cmd</span><strong>${fmt.dt(g.first_command_at)}</strong></div>
			<div><span>Last cmd</span><strong>${fmt.dt(g.last_command_at)} (${fmt.rel(g.last_command_at)})</strong></div>
			<div><span>Récence</span><strong>${escapeHtml(g.activity)}</strong></div>
		</div>
		<p><strong>Top commandes</strong></p>
		<div class="chips">${(g.top_commands || []).map((c) => `<span class="chip">/${escapeHtml(c.name)} ${c.count}</span>`).join('') || '—'}</div>
	`;
	document.getElementById('drawer').classList.add('open');
	document.getElementById('drawer').setAttribute('aria-hidden', 'false');
	document.getElementById('backdrop').classList.add('open');
}

function closeDrawer() {
	selectedGuildId = null;
	document.getElementById('drawer').classList.remove('open');
	document.getElementById('drawer').setAttribute('aria-hidden', 'true');
	document.getElementById('backdrop').classList.remove('open');
}

function switchView(name) {
	document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
	document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
	requestAnimationFrame(() => {
		Object.values(charts).forEach((c) => c.resize());
	});
	if (name === 'contacts' && !contactsData && !contactsLoading) loadContacts(false);
}

function fillCommandFilter(data) {
	const sel = document.getElementById('fCommand');
	const current = state.command;
	sel.innerHTML = '<option value="">Toutes</option>' + (data.commands || []).map((c) =>
		`<option value="${escapeHtml(c.name)}">/${escapeHtml(c.name)} (${fmt.n(c.total)})</option>`).join('');
	sel.value = current;
}

function renderAll(data) {
	raw = data;
	const envPill = `<span class="pill ${data.env_file === '.env.prod' ? 'prod' : ''}">${escapeHtml(data.env_file || '?')} · ${escapeHtml(data.db_name || '?')}</span>`;
	document.getElementById('meta').innerHTML =
		`${envPill} ${fmt.dt(data.generated_at)} · ${fmt.n(data.kpis.active_guilds)} actifs / ${fmt.n(data.kpis.total_seen_guilds)} vus`;
	document.getElementById('footer').textContent =
		`Mongo ${data.db_name || '?'} via ${data.env_file || '?'} · 127.0.0.1 · logs_enabled=${data.product.servers_logs_enabled}`;
	renderKpis(data);
	fillCommandFilter(data);
	renderOverviewCharts(data);
	renderCommandCharts(data);
	renderProductCharts(data);
	renderGuilds();
	const drawerOpen = document.getElementById('drawer').classList.contains('open');
	if (drawerOpen && selectedGuildId) {
		const g = data.guilds.find((x) => x.guild_id === selectedGuildId);
		if (g) openDrawer(g);
		else closeDrawer();
	}
}

async function load(silent = false) {
	if (!silent) document.getElementById('meta').textContent = 'Chargement…';
	try {
		const res = await fetch('/api/summary');
		const data = await res.json();
		if (!res.ok) throw new Error(data.error || res.statusText);
		renderAll(data);
	}
	catch (err) {
		document.getElementById('meta').innerHTML = `<span class="error">Erreur : ${escapeHtml(err.message)}</span>`;
	}
}

function scheduleAuto() {
	clearInterval(timer);
	if (autoRefresh) timer = setInterval(() => load(true), 60000);
}

// events
document.getElementById('refresh').addEventListener('click', () => load(false));
document.getElementById('autoBtn').addEventListener('click', (e) => {
	autoRefresh = !autoRefresh;
	e.currentTarget.classList.toggle('active', autoRefresh);
	scheduleAuto();
});
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));
document.getElementById('fSearch').addEventListener('input', (e) => {
	state.search = e.target.value;
	renderGuilds();
});
document.getElementById('fSetup').addEventListener('change', (e) => {
	state.setup = e.target.value;
	renderGuilds();
});
document.getElementById('fActivity').addEventListener('change', (e) => {
	state.activity = e.target.value;
	renderGuilds();
});
document.getElementById('fMinCmds').addEventListener('input', (e) => {
	state.minCmds = Number(e.target.value) || 0;
	renderGuilds();
});
document.getElementById('fCommand').addEventListener('change', (e) => {
	state.command = e.target.value;
	renderCommandCharts(raw);
	renderGuilds();
});
document.getElementById('fReset').addEventListener('click', () => {
	state.search = '';
	state.setup = 'all';
	state.activity = 'all';
	state.minCmds = 0;
	state.command = '';
	document.getElementById('fSearch').value = '';
	document.getElementById('fSetup').value = 'all';
	document.getElementById('fActivity').value = 'all';
	document.getElementById('fMinCmds').value = '0';
	document.getElementById('fCommand').value = '';
	renderCommandCharts(raw);
	renderGuilds();
});
document.getElementById('fLeftSearch').addEventListener('input', (e) => {
	state.leftSearch = e.target.value;
	renderGuilds();
});
document.getElementById('fLeftSort').addEventListener('change', (e) => {
	state.leftSort = e.target.value;
	renderGuilds();
});
document.getElementById('fContactSearch').addEventListener('input', (e) => {
	state.contactSearch = e.target.value;
	renderContacts();
});
document.getElementById('fContactView').addEventListener('change', (e) => {
	state.contactView = e.target.value;
	renderContacts();
});
document.getElementById('contactsRefresh').addEventListener('click', () => loadContacts(true));
document.getElementById('contactsPeople').addEventListener('click', async (e) => {
	const btn = e.target.closest('[data-copy]');
	if (!btn) return;
	try {
		await navigator.clipboard.writeText(btn.dataset.copy);
		btn.textContent = 'copié';
		setTimeout(() => { btn.textContent = btn.dataset.copy; }, 900);
	}
	catch {
		btn.textContent = 'ctrl+c';
	}
});

document.querySelector('#view-guilds thead').addEventListener('click', (e) => {
	const th = e.target.closest('th[data-sort]');
	if (!th) return;
	const key = th.dataset.sort;
	if (sortKey === key) {sortDir = sortDir === 'asc' ? 'desc' : 'asc';}
	else { sortKey = key; sortDir = key === 'name' ? 'asc' : 'desc'; }
	renderGuilds();
});

document.querySelector('#view-commands').addEventListener('click', (e) => {
	const th = e.target.closest('th[data-sort-cmd]');
	if (th) {
		const key = th.dataset.sortCmd;
		if (cmdSortKey === key) {cmdSortDir = cmdSortDir === 'asc' ? 'desc' : 'asc';}
		else { cmdSortKey = key; cmdSortDir = key === 'name' ? 'asc' : 'desc'; }
		renderCommandCharts(raw);
		return;
	}
	const btn = e.target.closest('[data-cmd]');
	if (btn) {
		const name = btn.dataset.cmd;
		state.command = state.command === name ? '' : name;
		document.getElementById('fCommand').value = state.command;
		renderCommandCharts(raw);
		renderGuilds();
	}
});

document.getElementById('guilds').addEventListener('click', (e) => {
	const chip = e.target.closest('[data-cmd]');
	if (chip) {
		e.stopPropagation();
		state.command = state.command === chip.dataset.cmd ? '' : chip.dataset.cmd;
		document.getElementById('fCommand').value = state.command;
		renderCommandCharts(raw);
		renderGuilds();
		return;
	}
	const tr = e.target.closest('tr[data-gid]');
	if (!tr) return;
	const g = raw.guilds.find((x) => x.guild_id === tr.dataset.gid);
	openDrawer(g);
});
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
document.getElementById('backdrop').addEventListener('click', closeDrawer);

load(false);
scheduleAuto();


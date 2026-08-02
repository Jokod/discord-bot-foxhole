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
let currentUser = null;

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

async function api(path, options = {}) {
	const opts = {
		credentials: 'same-origin',
		...options,
		headers: {
			...(options.body ? { 'Content-Type': 'application/json' } : {}),
			...options.headers,
		},
	};
	const res = await fetch(path, opts);
	const text = await res.text();
	let data;
	try {
		data = text ? JSON.parse(text) : null;
	}
	catch {
		data = { error: text || res.statusText };
	}
	if (res.status === 401 && path !== '/api/login') {
		showLogin();
		const err = new Error(apiMessage(data, 'error.auth'));
		err.status = 401;
		throw err;
	}
	if (!res.ok) {
		const err = new Error(apiMessage(data, 'error.generic'));
		err.status = res.status;
		err.code = data?.code;
		throw err;
	}
	return data;
}

function showLogin() {
	currentUser = null;
	document.getElementById('app').hidden = true;
	document.getElementById('loginGate').hidden = false;
	clearInterval(timer);
	document.getElementById('refreshTools').hidden = true;
}

function showApp(user) {
	currentUser = user;
	document.getElementById('loginGate').hidden = true;
	document.getElementById('app').hidden = false;
	document.getElementById('userPill').textContent = user.username;
	document.getElementById('defaultCredBanner').hidden = !user.isDefault;
	document.getElementById('profileUser').value = user.username;
	document.getElementById('profileBackBtn').hidden = !!user.isDefault;
	document.getElementById('refreshTools').hidden = !!user.isDefault;
	closeUserMenu();
	if (user.isDefault) switchView('profile');
	else switchView('overview');
}

function openUserMenu() {
	const panel = document.getElementById('userMenuPanel');
	const btn = document.getElementById('userMenuBtn');
	panel.hidden = false;
	btn.setAttribute('aria-expanded', 'true');
}

function closeUserMenu() {
	const panel = document.getElementById('userMenuPanel');
	const btn = document.getElementById('userMenuBtn');
	if (!panel || !btn) return;
	panel.hidden = true;
	btn.setAttribute('aria-expanded', 'false');
}

async function bootstrapAuth() {
	try {
		const me = await api('/api/me');
		if (!me?.authenticated) {
			showLogin();
			return false;
		}
		showApp(me);
		return true;
	}
	catch {
		showLogin();
		return false;
	}
}

const { t, locale, loadLang, detectLang, apiMessage, getLang } = window.DashboardI18n;

const fmt = {
	n: (v) => new Intl.NumberFormat(locale()).format(v ?? 0),
	pct: (v) => `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(v ?? 0)} %`,
	dt: (v) => {
		if (!v) return '—';
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(locale(), { dateStyle: 'short', timeStyle: 'short' }).format(d);
	},
	rel: (v) => {
		if (!v) return t('never');
		const m = Math.floor((Date.now() - new Date(v).getTime()) / 60000);
		if (m < 60) return t('rel.min', { n: m });
		const h = Math.floor(m / 60);
		if (h < 48) return t('rel.hours', { n: h });
		return t('rel.days', { n: Math.floor(h / 24) });
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
		[t('kpi.active'), k.active_guilds, t('kpi.seen', { n: k.total_seen_guilds })],
		[t('chart.setup'), k.setup_servers, fmt.pct(k.setup_rate_pct)],
		[t('kpi.noSetup'), k.pending_setup, ''],
		[t('kpi.left'), k.left_guilds, ''],
		[t('kpi.commands'), k.total_commands, t('kpi.avg', { n: fmt.n(k.avg_commands_per_active) })],
		[t('kpi.engaged7d'), k.engaged_7d, fmt.pct(k.engagement_7d_pct)],
		[t('kpi.members'), k.total_members_active, t('kpi.avg', { n: fmt.n(k.avg_members) })],
		[t('kpi.boardsLabel'), k.orderboards, t('kpi.boardsOpen', { n: fmt.n(k.orderboards_open) })],
		[t('kpi.lines'), k.orderlines, fmt.pct(data.product.orderline_progress.pct)],
		[t('kpi.stockpiles'), k.stockpiles, t('kpi.boards', { n: fmt.n(k.total_stock_boards) })],
		[t('kpi.opsDocs'), k.operations_docs, t('kpi.opsStats', { n: fmt.n(k.total_operations) })],
		[t('kpi.notifs'), k.notifications, t('kpi.msgs', { n: fmt.n(k.tracked_messages) })],
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
				{ label: t('chart.joins'), data: data.activity.joins_by_month.map((m) => m.count), borderColor: '#2f6b4f', backgroundColor: 'rgba(47,107,79,.12)', fill: true, tension: 0.3 },
				{ label: t('chart.leaves'), data: data.activity.leaves_by_month.map((m) => m.count), borderColor: '#b4451a', backgroundColor: 'rgba(180,69,26,.10)', fill: true, tension: 0.3 },
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
			labels: [t('chart.setup'), t('chart.noSetup'), t('chart.engaged7d'), t('chart.inactive7d')],
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
	document.getElementById('lineProgressHint').textContent = t('product.lineHint', {
		done: fmt.n(prog.current || 0),
		target: fmt.n(prog.target || 0),
		pct: fmt.n(prog.pct || 0),
	});
	const remain = Math.max(0, (prog.target || 0) - (prog.current || 0));
	makeChart('chartLineProgress', {
		type: 'doughnut',
		data: {
			labels: [t('product.delivered'), t('product.remaining')],
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
	document.getElementById('guildCount').textContent = t('guilds.count', { n: fmt.n(guilds.length), total: fmt.n(raw.guilds.length) });
	const af = document.getElementById('activeFilter');
	if (state.command) {
		af.hidden = false;
		af.textContent = t('guilds.filterCmd', { cmd: state.command });
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
			<td><span class="badge ${g.setup ? 'ok' : 'warn'}">${g.setup ? t('yes') : t('no')}</span></td>
			<td class="mono">${g.lang ? escapeHtml(g.lang) : '<span class="muted">—</span>'}</td>
			<td class="mono">${fmt.n(g.command_count)}</td>
			<td class="mono">${fmt.n(g.member_count)}</td>
			<td class="mono">${fmt.n(g.operation_count)}</td>
			<td class="mono">${fmt.n(g.stock_board_count)}</td>
			<td class="mono" title="${fmt.dt(g.last_command_at)}"><span class="badge info">${escapeHtml(g.activity)}</span> ${fmt.rel(g.last_command_at)}</td>
			<td><div class="chips">${(g.top_commands || []).slice(0, 3).map((c) => `<span class="chip ${state.command === c.name ? 'active' : ''}" data-cmd="${escapeHtml(c.name)}">/${escapeHtml(c.name)} ${c.count}</span>`).join('') || '—'}</div></td>
		</tr>`).join('') : '<tr><td colspan="9" class="muted">' + t('guilds.empty') + '</td></tr>';

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
		owner: ['info', t('contacts.owner')],
		creator: ['warn', t('contacts.creator')],
	};
	const [cls, label] = map[role] || ['info', role];
	return `<span class="badge ${cls}">${label}</span>`;
}

function renderContacts() {
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
					<div class="muted" style="font-size:.78rem;margin-top:.15rem">${fmt.n(g.member_count)} membres · join ${fmt.dt(g.joined_at)}</div>
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
		`<span class="chip" title="${escapeHtml(g.role)}${g.active === false ? ' · retiré' : ''}">${escapeHtml(g.name.slice(0, 24))}${g.active === false ? ' ✕' : ''}</span>`).join('')}</div>
				<div class="muted" style="font-size:.75rem;margin-top:.25rem">${t('contacts.serversCount', { n: fmt.n(p.guild_count) })}</div>
			</td>
			<td>
				<button type="button" class="copy-id" data-copy="${escapeHtml(p.user_id)}" title="Copier">${escapeHtml(p.user_id)}</button>
				<div><a class="mono" href="${escapeHtml(p.profile_url)}" target="_blank" rel="noopener">profil</a></div>
			</td>
		</tr>`).join('') : `<tr><td colspan="4" class="muted">${t('contacts.emptyPeople')}</td></tr>`;
}

async function loadContacts(force = false) {
	contactsLoading = true;
	renderContacts();
	try {
		contactsData = await api(`/api/contacts${force ? '?force=1' : ''}`);
	}
	catch (err) {
		if (err.status === 401) return;
		document.getElementById('contactsMeta').innerHTML =
			`<span class="error">${escapeHtml(t('error.contacts', { msg: err.message }))}</span>`;
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
			<div><span>${t('drawer.setup')}</span><strong>${g.setup ? t('yes') : t('no')}</strong></div>
			<div><span>${t('drawer.lang')}</span><strong>${g.lang ? escapeHtml(g.lang) : '—'}</strong></div>
			<div><span>${t('drawer.camp')}</span><strong>${g.camp ? escapeHtml(g.camp) : '—'}</strong></div>
			<div><span>${t('drawer.members')}</span><strong>${fmt.n(g.member_count)}</strong></div>
			<div><span>${t('drawer.commands')}</span><strong>${fmt.n(g.command_count)}</strong></div>
			<div><span>${t('drawer.ops')}</span><strong>${fmt.n(g.operation_count)}</strong></div>
			<div><span>${t('drawer.stocks')}</span><strong>${fmt.n(g.stock_board_count)}</strong></div>
			<div><span>Cmd / membre</span><strong>${fmt.n(g.cmds_per_member)}</strong></div>
			<div><span>${t('drawer.joined')}</span><strong>${fmt.dt(g.joined_at)}</strong></div>
			<div><span>First cmd</span><strong>${fmt.dt(g.first_command_at)}</strong></div>
			<div><span>${t('drawer.lastCmd')}</span><strong>${fmt.dt(g.last_command_at)} (${fmt.rel(g.last_command_at)})</strong></div>
			<div><span>${t('guilds.colRecency')}</span><strong>${escapeHtml(g.activity)}</strong></div>
		</div>
		<p><strong>${t('overview.topCmds')}</strong></p>
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
	const isProfile = name === 'profile';
	const statsChrome = document.getElementById('statsChrome');
	const profileView = document.getElementById('view-profile');
	statsChrome.hidden = isProfile;
	profileView.hidden = !isProfile;
	profileView.classList.toggle('active', isProfile);

	if (!isProfile) {
		document.querySelectorAll('#statsChrome .view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
		document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === name));
		requestAnimationFrame(() => {
			Object.values(charts).forEach((c) => c.resize());
		});
		if (name === 'contacts' && !contactsData && !contactsLoading) loadContacts(false);
	}
	else {
		document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
	}
	closeUserMenu();
}

function fillCommandFilter(data) {
	const sel = document.getElementById('fCommand');
	const current = state.command;
	sel.innerHTML = `<option value="">${t('guilds.commandAll')}</option>` + (data.commands || []).map((c) =>
		`<option value="${escapeHtml(c.name)}">/${escapeHtml(c.name)} (${fmt.n(c.total)})</option>`).join('');
	sel.value = current;
}

function renderAll(data) {
	raw = data;
	const envPill = `<span class="pill ${data.env_file === '.env.prod' ? 'prod' : ''}">${escapeHtml(data.env_file || '?')} · ${escapeHtml(data.db_name || '?')}</span>`;
	document.getElementById('meta').innerHTML =
		`${envPill} ${fmt.dt(data.generated_at)} · ${t('meta.activeSeen', { active: fmt.n(data.kpis.active_guilds), seen: fmt.n(data.kpis.total_seen_guilds) })}`;
	document.getElementById('footer').textContent = t('footer');
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
	if (!currentUser) return;
	if (currentUser.isDefault) {
		document.getElementById('meta').textContent = t('meta.changePassword');
		return;
	}
	if (!silent) document.getElementById('meta').textContent = t('meta.loading');
	try {
		const data = await api('/api/summary');
		renderAll(data);
	}
	catch (err) {
		if (err.status === 401) return;
		if (err.status === 403) {
			document.getElementById('meta').innerHTML = `<span class="error">${escapeHtml(err.message)}</span>`;
			switchView('profile');
			return;
		}
		document.getElementById('meta').innerHTML = `<span class="error">${escapeHtml(t('error.generic', { msg: err.message }))}</span>`;
	}
}

function scheduleAuto() {
	clearInterval(timer);
	if (autoRefresh && currentUser && !currentUser.isDefault) {
		timer = setInterval(() => load(true), 60000);
	}
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const errEl = document.getElementById('loginError');
	errEl.hidden = true;
	try {
		const user = await api('/api/login', {
			method: 'POST',
			body: JSON.stringify({
				username: document.getElementById('loginUser').value,
				password: document.getElementById('loginPass').value,
			}),
		});
		document.getElementById('loginPass').value = '';
		showApp(user);
		await load(false);
		scheduleAuto();
	}
	catch (err) {
		errEl.textContent = err.message || t('error.loginFailed');
		errEl.hidden = false;
	}
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
	try {
		await api('/api/logout', { method: 'POST', body: '{}' });
	}
	catch {
		// ignore
	}
	showLogin();
});

document.getElementById('profileBtn').addEventListener('click', () => switchView('profile'));
document.getElementById('profileBackBtn').addEventListener('click', () => {
	if (currentUser?.isDefault) return;
	switchView('overview');
});

document.getElementById('userMenuBtn').addEventListener('click', (e) => {
	e.stopPropagation();
	const panel = document.getElementById('userMenuPanel');
	if (panel.hidden) openUserMenu();
	else closeUserMenu();
});
document.getElementById('userMenuPanel').addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('click', () => closeUserMenu());

document.getElementById('profileForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const errEl = document.getElementById('profileError');
	const okEl = document.getElementById('profileOk');
	errEl.hidden = true;
	okEl.hidden = true;
	const newPass = document.getElementById('profileNew').value;
	const newPass2 = document.getElementById('profileNew2').value;
	if (newPass || newPass2 || currentUser?.isDefault) {
		if (newPass !== newPass2) {
			errEl.textContent = t('profile.mismatch');
			errEl.hidden = false;
			return;
		}
		if (!newPass || newPass.length < 10) {
			errEl.textContent = t('profile.needNew', { min: 10 });
			errEl.hidden = false;
			return;
		}
	}
	try {
		const updated = await api('/api/profile', {
			method: 'POST',
			body: JSON.stringify({
				currentPassword: document.getElementById('profileCurrent').value,
				username: document.getElementById('profileUser').value,
				newPassword: newPass || undefined,
			}),
		});
		showApp(updated);
		document.getElementById('profileCurrent').value = '';
		document.getElementById('profileNew').value = '';
		document.getElementById('profileNew2').value = '';
		okEl.textContent = t('profile.ok');
		okEl.hidden = false;
		await load(false);
		scheduleAuto();
	}
	catch (err) {
		errEl.textContent = err.message || t('error.profileFailed');
		errEl.hidden = false;
	}
});

// events
document.getElementById('refresh').addEventListener('click', () => load(false));
document.getElementById('autoBtn').addEventListener('click', (e) => {
	autoRefresh = !autoRefresh;
	e.currentTarget.classList.toggle('active', autoRefresh);
	scheduleAuto();
});
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));
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

function syncLangSelects(lang) {
	for (const id of ['langSelect', 'loginLangSelect']) {
		const el = document.getElementById(id);
		if (el) el.value = lang;
	}
}

async function changeLanguage(lang) {
	await loadLang(lang);
	syncLangSelects(getLang());
	if (raw) renderAll(raw);
	if (contactsData || contactsLoading) renderContacts();
}

document.getElementById('langSelect').addEventListener('change', (e) => changeLanguage(e.target.value));
document.getElementById('loginLangSelect').addEventListener('change', (e) => changeLanguage(e.target.value));

(async () => {
	const lang = await loadLang(detectLang());
	syncLangSelects(lang);
	const ok = await bootstrapAuth();
	if (!ok) return;
	await load(false);
	scheduleAuto();
})();


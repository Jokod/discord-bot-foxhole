'use strict';

(function() {
	'use strict';

	window.Dashboard = window.Dashboard || {};

	const { t } = window.DashboardI18n;

	function getStore() {
		return window.Dashboard;
	}

	function renderKpis(data) {
		const { fmt } = getStore();
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
		const store = getStore();
		const {
			palette, makeChart, barOpts, doughnutOpts, series,
			localizeActivityBuckets, state,
		} = store;

		const act = series(localizeActivityBuckets(data.activity.buckets));
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
					store.switchView('guilds');
					store.renderGuilds();
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
					store.openDrawer(topCmds[els[0].index]);
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
					store.openDrawer(topMem[els[0].index]);
				},
			},
		}, !topMem.length);
	}

	function renderCommandCharts(data) {
		const store = getStore();
		const {
			fmt, escapeHtml, palette, makeChart, barOpts, doughnutOpts,
			state, raw, cmdSortKey, cmdSortDir,
		} = store;
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
					store.renderGuilds();
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
					store.renderGuilds();
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
		const { fmt, makeChart, barOpts, doughnutOpts, series, palette } = getStore();
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
		const { raw, state, sortKey, sortDir } = getStore();
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
		const {
			raw, state, fmt, escapeHtml, activityLabel, sortKey, sortDir,
		} = getStore();
		if (!raw) return;
		const guilds = filteredGuilds();
		document.getElementById('guildCount').textContent = t('guilds.count', { n: fmt.n(guilds.length), total: fmt.n(raw.guilds.length) });
		const af = document.getElementById('activeFilter');
		if (state.command) {
			af.hidden = false;
			af.textContent = t('guilds.filterCmd', { cmd: state.command });
		}
		else { af.hidden = true; }

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

		document.getElementById('guilds').innerHTML = guilds.length ? guilds.map((g) => {
			const blockedBadge = g.blocked
				? `<span class="badge blocked" title="${escapeHtml(g.blocked_source || '')}">${t('guilds.blocked')}</span> `
				: '';
			return `
		<tr class="row-click" data-gid="${g.guild_id}">
			<td>
				${blockedBadge}<strong>${escapeHtml(g.name)}</strong><br />
				<span class="mono muted">${g.guild_id}</span>
			</td>
			<td><span class="badge ${g.setup ? 'ok' : 'warn'}">${g.setup ? t('yes') : t('no')}</span></td>
			<td class="mono">${g.lang ? escapeHtml(g.lang) : '<span class="muted">—</span>'}</td>
			<td class="mono">${fmt.n(g.command_count)}</td>
			<td class="mono">${fmt.n(g.member_count)}</td>
			<td class="mono">${fmt.n(g.operation_count)}</td>
			<td class="mono">${fmt.n(g.stock_board_count)}</td>
			<td class="mono" title="${fmt.dt(g.last_command_at)}"><span class="badge info">${escapeHtml(activityLabel(g.activity))}</span> ${fmt.rel(g.last_command_at)}</td>
			<td><div class="chips">${(g.top_commands || []).slice(0, 3).map((c) => `<span class="chip ${state.command === c.name ? 'active' : ''}" data-cmd="${escapeHtml(c.name)}">/${escapeHtml(c.name)} ${c.count}</span>`).join('') || '—'}</div></td>
		</tr>`;
		}).join('') : '<tr><td colspan="9" class="muted">' + t('guilds.empty') + '</td></tr>';

		getStore().syncGuildActionsUi?.();

		const blocked = raw.blocked_guilds || [];
		const blockedCount = document.getElementById('blockedCount');
		if (blockedCount) {
			blockedCount.textContent = t('guilds.blockedCount', { n: fmt.n(blocked.length) });
		}
		const blockedBody = document.getElementById('blocked');
		if (blockedBody) {
			blockedBody.innerHTML = blocked.length ? blocked.map((g) => {
				const can = g.can_unblacklist;
				const status = g.active
					? t('guilds.blockedStillIn')
					: (g.left_at ? t('guilds.blockedLeft') : t('guilds.blockedUnknown'));
				const action = can
					? `<button type="button" data-unblacklist="${escapeHtml(g.guild_id)}">${t('guilds.actUnblacklist')}</button>`
					: `<span class="muted" title="${escapeHtml(t('guilds.unblacklistEnvOnly'))}">${t('guilds.unblacklistEnvOnly')}</span>`;
				return `
		<tr>
			<td><strong>${escapeHtml(g.name)}</strong><br /><span class="mono muted">${escapeHtml(g.guild_id)}</span></td>
			<td><span class="badge blocked">${escapeHtml(g.source)}</span></td>
			<td>${escapeHtml(status)}</td>
			<td>${action}</td>
		</tr>`;
			}).join('') : `<tr><td colspan="4" class="muted">${t('guilds.emptyBlocked')}</td></tr>`;
		}

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
		</tr>`).join('') : `<tr><td colspan="3" class="muted">${t('guilds.emptyLeft')}</td></tr>`;
	}

	function openDrawer(g) {
		const { fmt, escapeHtml, activityLabel } = getStore();
		if (!g) return;
		getStore().selectedGuildId = g.guild_id;
		document.getElementById('drawerBody').innerHTML = `
		<h3>${escapeHtml(g.name)}</h3>
		<p class="mono muted">${g.guild_id}</p>
		<div class="stat-list">
			<div><span>${t('drawer.setup')}</span><strong>${g.setup ? t('yes') : t('no')}</strong></div>
			<div><span>${t('guilds.blocked')}</span><strong>${g.blocked ? `${t('yes')} (${escapeHtml(g.blocked_source || '—')})` : t('no')}</strong></div>
			<div><span>${t('drawer.lang')}</span><strong>${g.lang ? escapeHtml(g.lang) : '—'}</strong></div>
			<div><span>${t('drawer.camp')}</span><strong>${g.camp ? escapeHtml(g.camp) : '—'}</strong></div>
			<div><span>${t('drawer.members')}</span><strong>${fmt.n(g.member_count)}</strong></div>
			<div><span>${t('drawer.commands')}</span><strong>${fmt.n(g.command_count)}</strong></div>
			<div><span>${t('drawer.ops')}</span><strong>${fmt.n(g.operation_count)}</strong></div>
			<div><span>${t('drawer.stocks')}</span><strong>${fmt.n(g.stock_board_count)}</strong></div>
			<div><span>${t('drawer.cmdsPerMember')}</span><strong>${fmt.n(g.cmds_per_member)}</strong></div>
			<div><span>${t('drawer.joined')}</span><strong>${fmt.dt(g.joined_at)}</strong></div>
			<div><span>${t('drawer.firstCmd')}</span><strong>${fmt.dt(g.first_command_at)}</strong></div>
			<div><span>${t('drawer.lastCmd')}</span><strong>${fmt.dt(g.last_command_at)} (${fmt.rel(g.last_command_at)})</strong></div>
			<div><span>${t('guilds.colRecency')}</span><strong>${escapeHtml(activityLabel(g.activity))}</strong></div>
		</div>
		<p><strong>${t('overview.topCmds')}</strong></p>
		<div class="chips">${(g.top_commands || []).map((c) => `<span class="chip">/${escapeHtml(c.name)} ${c.count}</span>`).join('') || '—'}</div>
	`;
		document.getElementById('drawer').classList.add('open');
		document.getElementById('drawer').setAttribute('aria-hidden', 'false');
		document.getElementById('backdrop').classList.add('open');
		getStore().syncGuildActionsUi?.();
	}

	function closeDrawer() {
		getStore().selectedGuildId = null;
		document.getElementById('drawer').classList.remove('open');
		document.getElementById('drawer').setAttribute('aria-hidden', 'true');
		document.getElementById('backdrop').classList.remove('open');
		getStore().syncGuildActionsUi?.();
	}

	function fillCommandFilter(data) {
		const { state, fmt, escapeHtml } = getStore();
		const sel = document.getElementById('fCommand');
		const current = state.command;
		sel.innerHTML = `<option value="">${t('guilds.commandAll')}</option>` + (data.commands || []).map((c) =>
			`<option value="${escapeHtml(c.name)}">/${escapeHtml(c.name)} (${fmt.n(c.total)})</option>`).join('');
		sel.value = current;
	}

	Object.assign(window.Dashboard, {
		renderKpis,
		renderOverviewCharts,
		renderCommandCharts,
		renderProductCharts,
		filteredGuilds,
		renderGuilds,
		openDrawer,
		closeDrawer,
		fillCommandFilter,
	});
})();

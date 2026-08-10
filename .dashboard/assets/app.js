'use strict';

(function() {
	'use strict';

	window.Dashboard = window.Dashboard || {};

	const { t, loadLang, detectLang, apiMessage, getLang } = window.DashboardI18n;
	const D = window.Dashboard;

	D.raw = null;
	D.contactsData = null;
	D.contactsLoading = false;
	D.materialsData = null;
	D.materialsLoading = false;
	D.selectedMaterialName = null;
	D.autoRefresh = true;
	D.timer = null;
	D.sortKey = 'command_count';
	D.sortDir = 'desc';
	D.cmdSortKey = 'total';
	D.cmdSortDir = 'desc';
	D.selectedGuildId = null;
	D.currentUser = null;
	D.links = { discord: null, github: null };
	D.sessionInfo = null;
	D.state = {
		search: '',
		setup: 'all',
		activity: 'all',
		minCmds: 0,
		command: '',
		leftSearch: '',
		leftSort: 'left_at',
		contactSearch: '',
		contactView: 'guilds',
		matSearch: '',
		matCategory: 'all',
		matSubcategory: 'all',
		matFaction: 'all',
		matSort: 'name',
		matSortDir: 'asc',
		matView: 'grid',
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
	D.api = api;

	function showLogin() {
		D.currentUser = null;
		D.sessionInfo = null;
		const footerMeta = document.getElementById('footerMeta');
		if (footerMeta) footerMeta.textContent = '';
		document.getElementById('app').hidden = true;
		document.getElementById('loginGate').hidden = false;
		clearInterval(D.timer);
		D.stopWarTick?.();
		document.getElementById('refreshTools').hidden = true;
	}

	function applyLinks(payload) {
		const links = payload?.links || {};
		D.links = {
			discord: links.discord || null,
			github: links.github || null,
		};
		const discordEl = document.getElementById('footerDiscord');
		const githubEl = document.getElementById('footerGithub');
		const wrap = document.getElementById('footerLinks');
		if (D.links.discord) {
			discordEl.href = D.links.discord;
			discordEl.hidden = false;
		}
		else {
			discordEl.removeAttribute('href');
			discordEl.hidden = true;
		}
		if (D.links.github) {
			githubEl.href = D.links.github;
			githubEl.hidden = false;
		}
		else {
			githubEl.removeAttribute('href');
			githubEl.hidden = true;
		}
		wrap.hidden = !(D.links.discord || D.links.github);
	}

	function remainingLabel(expiresAt) {
		if (!expiresAt) return '—';
		const m = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 60000));
		if (m < 60) return t('rel.min', { n: m });
		const h = Math.floor(m / 60);
		if (h < 48) return t('rel.hours', { n: h });
		return t('rel.days', { n: Math.floor(h / 24) });
	}

	function renderFooterSession(session) {
		if (session) D.sessionInfo = session;
		const el = document.getElementById('footerMeta');
		const s = D.sessionInfo;
		if (!el) return;
		if (!s) {
			el.textContent = '';
			return;
		}
		const parts = [];
		const started = s.started_at ? D.fmt.dt(s.started_at) : null;
		const startedRel = s.started_at ? D.fmt.rel(s.started_at) : null;
		if (started) {
			parts.push(`<span title="${D.escapeHtml(started)}">${t('footer.since', { when: D.escapeHtml(startedRel) })}</span>`);
		}
		if (s.ip) {
			parts.push(`<span>${t('footer.ip', { ip: `<strong>${D.escapeHtml(s.ip)}</strong>` })}</span>`);
		}
		if (s.expires_at) {
			parts.push(`<span title="${D.escapeHtml(D.fmt.dt(s.expires_at))}">${t('footer.expires', { when: D.escapeHtml(remainingLabel(s.expires_at)) })}</span>`);
		}
		const n = Number(s.active_sessions) || 1;
		parts.push(`<span>${t('footer.sessions', { n: D.escapeHtml(String(n)) })}</span>`);
		el.innerHTML = parts.join('<span class="sep" aria-hidden="true">·</span>');
	}

	function showApp(user) {
		D.currentUser = user;
		applyLinks(user);
		renderFooterSession(user.session);
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
			applyLinks(me);
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
				Object.values(D.charts).forEach((c) => c.resize());
			});
			if (name === 'contacts' && !D.contactsData && !D.contactsLoading) D.loadContacts(false);
			if (name === 'materials' && !D.materialsData && !D.materialsLoading) D.loadMaterials(false);
		}
		else {
			document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
		}
		closeUserMenu();
	}
	D.switchView = switchView;

	function renderAll(data) {
		D.raw = data;
		const envPill = `<span class="pill ${data.env_file === '.env.prod' ? 'prod' : ''}">${D.escapeHtml(data.env_file || '?')} · ${D.escapeHtml(data.db_name || '?')}</span>`;
		document.getElementById('meta').innerHTML =
		`${envPill} ${D.fmt.dt(data.generated_at)} · ${t('meta.activeSeen', { active: D.fmt.n(data.kpis.active_guilds), seen: D.fmt.n(data.kpis.total_seen_guilds) })}`;
		if (data.session) renderFooterSession(data.session);
		D.renderWar(data);
		D.renderKpis(data);
		D.fillCommandFilter(data);
		D.renderOverviewCharts(data);
		D.renderCommandCharts(data);
		D.renderProductCharts(data);
		D.renderGuilds();
		const drawerOpen = document.getElementById('drawer').classList.contains('open');
		if (drawerOpen && D.selectedGuildId) {
			const g = data.guilds.find((x) => x.guild_id === D.selectedGuildId);
			if (g) D.openDrawer(g);
			else D.closeDrawer();
		}
	}

	async function load(silent = false) {
		if (!D.currentUser) return;
		if (D.currentUser.isDefault) {
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
				document.getElementById('meta').innerHTML = `<span class="error">${D.escapeHtml(err.message)}</span>`;
				switchView('profile');
				return;
			}
			document.getElementById('meta').innerHTML = `<span class="error">${D.escapeHtml(t('error.generic', { msg: err.message }))}</span>`;
		}
	}
	D.load = load;

	function scheduleAuto() {
		clearInterval(D.timer);
		if (D.autoRefresh && D.currentUser && !D.currentUser.isDefault) {
			D.timer = setInterval(() => load(true), 60000);
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
		if (D.currentUser?.isDefault) return;
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
		if (newPass || newPass2 || D.currentUser?.isDefault) {
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

	document.getElementById('refresh').addEventListener('click', () => load(false));
	document.getElementById('autoBtn').addEventListener('click', (e) => {
		D.autoRefresh = !D.autoRefresh;
		e.currentTarget.classList.toggle('active', D.autoRefresh);
		scheduleAuto();
	});
	document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));
	document.getElementById('fSearch').addEventListener('input', (e) => {
		D.state.search = e.target.value;
		D.renderGuilds();
	});
	document.getElementById('fSetup').addEventListener('change', (e) => {
		D.state.setup = e.target.value;
		D.renderGuilds();
	});
	document.getElementById('fActivity').addEventListener('change', (e) => {
		D.state.activity = e.target.value;
		D.renderGuilds();
	});
	document.getElementById('fMinCmds').addEventListener('input', (e) => {
		D.state.minCmds = Number(e.target.value) || 0;
		D.renderGuilds();
	});
	document.getElementById('fCommand').addEventListener('change', (e) => {
		D.state.command = e.target.value;
		D.renderCommandCharts(D.raw);
		D.renderGuilds();
	});
	document.getElementById('fReset').addEventListener('click', () => {
		D.state.search = '';
		D.state.setup = 'all';
		D.state.activity = 'all';
		D.state.minCmds = 0;
		D.state.command = '';
		document.getElementById('fSearch').value = '';
		document.getElementById('fSetup').value = 'all';
		document.getElementById('fActivity').value = 'all';
		document.getElementById('fMinCmds').value = '0';
		document.getElementById('fCommand').value = '';
		D.renderCommandCharts(D.raw);
		D.renderGuilds();
	});
	document.getElementById('fLeftSearch').addEventListener('input', (e) => {
		D.state.leftSearch = e.target.value;
		D.renderGuilds();
	});
	document.getElementById('fLeftSort').addEventListener('change', (e) => {
		D.state.leftSort = e.target.value;
		D.renderGuilds();
	});
	document.getElementById('fContactSearch').addEventListener('input', (e) => {
		D.state.contactSearch = e.target.value;
		D.renderContacts();
	});
	document.getElementById('fContactView').addEventListener('change', (e) => {
		D.state.contactView = e.target.value;
		D.renderContacts();
	});
	document.getElementById('contactsRefresh').addEventListener('click', () => D.loadContacts(true));
	document.getElementById('contactsPeople').addEventListener('click', async (e) => {
		const btn = e.target.closest('[data-copy]');
		if (!btn) return;
		try {
			await navigator.clipboard.writeText(btn.dataset.copy);
			btn.textContent = t('contacts.copied');
			setTimeout(() => { btn.textContent = btn.dataset.copy; }, 900);
		}
		catch {
			btn.textContent = t('contacts.copyFallback');
		}
	});

	document.getElementById('fMatSearch').addEventListener('input', (e) => {
		D.state.matSearch = e.target.value;
		D.renderMaterials();
	});
	document.getElementById('fMatCategory').addEventListener('change', (e) => {
		D.state.matCategory = e.target.value;
		D.fillSubcategoryOptions(e.target.value, 'all');
		D.state.matSubcategory = document.getElementById('fMatSubcategory').value;
		D.renderMaterials();
	});
	document.getElementById('fMatSubcategory').addEventListener('change', (e) => {
		D.state.matSubcategory = e.target.value;
		D.renderMaterials();
	});
	document.getElementById('fMatFaction').addEventListener('change', (e) => {
		D.state.matFaction = e.target.value;
		D.renderMaterials();
	});
	document.getElementById('fMatSort').addEventListener('change', (e) => {
		D.state.matSort = e.target.value;
		D.renderMaterials();
	});
	document.getElementById('fMatView').addEventListener('change', (e) => {
		D.state.matView = e.target.value;
		D.renderMaterials();
	});
	document.getElementById('fMatReset').addEventListener('click', () => {
		D.state.matSearch = '';
		D.state.matCategory = 'all';
		D.state.matSubcategory = 'all';
		D.state.matFaction = 'all';
		D.state.matSort = 'name';
		D.state.matView = 'grid';
		document.getElementById('fMatSearch').value = '';
		document.getElementById('fMatFaction').value = 'all';
		document.getElementById('fMatSort').value = 'name';
		document.getElementById('fMatView').value = 'grid';
		D.fillCategoryOptions();
		D.renderMaterials();
	});
	document.getElementById('materialsGrid').addEventListener('click', (e) => {
		const card = e.target.closest('[data-mat-name]');
		if (!card) return;
		const item = D.findMaterial(card.dataset.matName);
		if (item) D.openMaterialDrawer(item);
	});
	document.getElementById('materialsTableBody').addEventListener('click', (e) => {
		const row = e.target.closest('tr[data-mat-name]');
		if (!row) return;
		const item = D.findMaterial(row.dataset.matName);
		if (item) D.openMaterialDrawer(item);
	});

	document.querySelector('#view-guilds thead').addEventListener('click', (e) => {
		const th = e.target.closest('th[data-sort]');
		if (!th) return;
		const key = th.dataset.sort;
		if (D.sortKey === key) { D.sortDir = D.sortDir === 'asc' ? 'desc' : 'asc'; }
		else { D.sortKey = key; D.sortDir = key === 'name' ? 'asc' : 'desc'; }
		D.renderGuilds();
	});

	document.querySelector('#view-commands').addEventListener('click', (e) => {
		const th = e.target.closest('th[data-sort-cmd]');
		if (th) {
			const key = th.dataset.sortCmd;
			if (D.cmdSortKey === key) { D.cmdSortDir = D.cmdSortDir === 'asc' ? 'desc' : 'asc'; }
			else { D.cmdSortKey = key; D.cmdSortDir = key === 'name' ? 'asc' : 'desc'; }
			D.renderCommandCharts(D.raw);
			return;
		}
		const btn = e.target.closest('[data-cmd]');
		if (btn) {
			const name = btn.dataset.cmd;
			D.state.command = D.state.command === name ? '' : name;
			document.getElementById('fCommand').value = D.state.command;
			D.renderCommandCharts(D.raw);
			D.renderGuilds();
		}
	});

	document.getElementById('guilds').addEventListener('click', (e) => {
		const chip = e.target.closest('[data-cmd]');
		if (chip) {
			e.stopPropagation();
			D.state.command = D.state.command === chip.dataset.cmd ? '' : chip.dataset.cmd;
			document.getElementById('fCommand').value = D.state.command;
			D.renderCommandCharts(D.raw);
			D.renderGuilds();
			return;
		}
		const tr = e.target.closest('tr[data-gid]');
		if (!tr) return;
		const g = D.raw.guilds.find((x) => x.guild_id === tr.dataset.gid);
		D.openDrawer(g);
	});
	document.getElementById('drawerClose').addEventListener('click', () => D.closeDrawer());
	document.getElementById('backdrop').addEventListener('click', () => D.closeDrawer());
	D.bindGuildActions?.();

	function syncLangSelects(lang) {
		for (const id of ['langSelect', 'loginLangSelect']) {
			const el = document.getElementById(id);
			if (el) el.value = lang;
		}
	}

	async function changeLanguage(lang) {
		await loadLang(lang);
		syncLangSelects(getLang());
		if (D.raw) renderAll(D.raw);
		else renderFooterSession();
		if (D.contactsData || D.contactsLoading) D.renderContacts();
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
})();

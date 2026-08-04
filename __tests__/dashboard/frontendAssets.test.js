'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadBrowserScript(relPath, sandbox) {
	const file = path.join(__dirname, '../../.dashboard/assets', relPath);
	const code = fs.readFileSync(file, 'utf8');
	vm.runInNewContext(code, sandbox, { filename: file });
	return sandbox;
}

function el(overrides = {}) {
	return {
		hidden: false,
		textContent: '',
		innerHTML: '',
		value: '',
		checked: false,
		disabled: false,
		title: '',
		classList: {
			_set: new Set(),
			contains(name) { return this._set.has(name); },
			add(name) { this._set.add(name); },
			remove(name) { this._set.delete(name); },
			toggle(name, force) {
				if (force === undefined) {
					if (this._set.has(name)) this._set.delete(name);
					else this._set.add(name);
					return;
				}
				if (force) this._set.add(name);
				else this._set.delete(name);
			},
		},
		focus: jest.fn(),
		addEventListener: jest.fn(),
		setAttribute: jest.fn(),
		getAttribute: jest.fn((k) => overrides.attrs?.[k] ?? null),
		querySelectorAll: jest.fn(() => []),
		...overrides,
	};
}

describe('dashboard frontend assets', () => {
	describe('i18n', () => {
		it('detects, translates, and applies catalog', async () => {
			const store = {};
			const root = {
				querySelectorAll(sel) {
					if (sel === '[data-i18n]') {
						return [{
							getAttribute: () => 'hello',
							textContent: '',
						}];
					}
					return [];
				},
			};
			const sandbox = {
				window: {},
				localStorage: {
					getItem: (k) => store[k] ?? null,
					setItem: (k, v) => { store[k] = String(v); },
				},
				navigator: { language: 'fr-FR', languages: ['fr-FR'] },
				document: {
					title: '',
					documentElement: { lang: 'en' },
					querySelectorAll: (...args) => root.querySelectorAll(...args),
				},
				fetch: jest.fn().mockResolvedValue({
					ok: true,
					json: async () => ({ hello: 'Bonjour {n}', title: 'T', 'error.auth': 'auth' }),
				}),
			};
			sandbox.window = sandbox;
			loadBrowserScript('i18n.js', sandbox);

			const i18n = sandbox.window.DashboardI18n;
			expect(i18n.detectLang()).toBe('fr');
			await i18n.loadLang('fr');
			expect(i18n.t('hello', { n: 2 })).toBe('Bonjour 2');
			expect(i18n.locale()).toBe('fr-FR');
			expect(i18n.apiMessage({ code: 'error.auth' })).toBe('auth');
			expect(i18n.apiMessage({ error: 'x' })).toBe('x');
			expect(store.foxbot_dashboard_lang).toBe('fr');
			expect(sandbox.document.documentElement.lang).toBe('fr');
		});
	});

	describe('fmt', () => {
		it('formats numbers, dates, relative time and escapes html', () => {
			const sandbox = {
				window: {
					DashboardI18n: {
						t: (k, p) => (p ? `${k}:${p.n}` : k),
						locale: () => 'en-US',
					},
				},
			};
			loadBrowserScript('fmt.js', sandbox);
			const { fmt, escapeHtml } = sandbox.window.Dashboard;
			expect(fmt.n(1200)).toMatch(/1/);
			expect(fmt.pct(12.34)).toContain('%');
			expect(fmt.dt(null)).toBe('—');
			expect(fmt.dt('not-a-date')).toBe('—');
			expect(fmt.rel(null)).toBe('never');
			expect(fmt.rel(new Date().toISOString())).toMatch(/^rel\.min:/);
			expect(escapeHtml('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
		});
	});

	describe('guildActions', () => {
		function setupGuildActions(guildOverrides = {}) {
			const blacklistRow = el({ hidden: false });
			const unblacklistRow = el({ hidden: true });
			const nodes = {
				drawer: el({
					classList: {
						_set: new Set(['open']),
						contains(n) { return this._set.has(n); },
						add(n) { this._set.add(n); },
						remove(n) { this._set.delete(n); },
						toggle(name, force) {
							if (force === false) this._set.delete(name);
							else if (force === true) this._set.add(name);
							else if (this._set.has(name)) this._set.delete(name);
							else this._set.add(name);
						},
					},
				}),
				guildActionsBar: el({ hidden: true }),
				guildModal: el({ hidden: true }),
				guildModalTitle: el(),
				guildModalSub: el(),
				guildModalList: el(),
				guildModalBroadcast: el({ hidden: true }),
				guildModalConfirmWrap: el({ hidden: true }),
				guildConfirmInput: el({ value: '' }),
				guildModalSubmit: el({ disabled: false }),
				guildModalError: el({ hidden: true }),
				guildModalReport: el({ hidden: true }),
				guildBroadcastDry: el({ checked: false }),
				guildBroadcastMsg: el({ value: '' }),
				guildActLeave: el(),
				guildActBlacklist: el(),
				guildActUnblacklist: el({ disabled: false, title: '' }),
				guildActBroadcast: el(),
				guildModalCancel: el(),
				blocked: el(),
			};
			const rows = {
				'[data-action-row="blacklist"]': blacklistRow,
				'[data-action-row="unblacklist"]': unblacklistRow,
			};
			const sandbox = {
				window: {
					Dashboard: {
						selectedGuildId: 'g1',
						raw: {
							guilds: [{
								guild_id: 'g1',
								name: 'Alpha',
								blocked: false,
								blocked_source: null,
								...guildOverrides,
							}],
							blocked_guilds: [{
								guild_id: 'g2',
								name: 'Blocked Two',
								source: 'mongo',
								can_unblacklist: true,
							}],
						},
						escapeHtml: (s) => String(s)
							.replaceAll('&', '&amp;')
							.replaceAll('<', '&lt;')
							.replaceAll('>', '&gt;')
							.replaceAll('"', '&quot;'),
						api: jest.fn().mockResolvedValue({
							results: [{ status: 'ok', name: 'Alpha', detail: 'left' }],
						}),
						load: jest.fn().mockResolvedValue(undefined),
					},
					DashboardI18n: {
						t: (k) => k,
					},
				},
				document: {
					getElementById: (id) => nodes[id] || null,
					querySelector: (sel) => rows[sel] || null,
				},
			};
			loadBrowserScript('guildActions.js', sandbox);
			return { sandbox, nodes, blacklistRow, unblacklistRow };
		}

		it('syncGuildActionsUi toggles blacklist/unblacklist rows', () => {
			const { sandbox, nodes, blacklistRow, unblacklistRow } = setupGuildActions({
				blocked: true,
				blocked_source: 'mongo',
			});
			sandbox.window.Dashboard.syncGuildActionsUi();
			expect(nodes.guildActionsBar.hidden).toBe(false);
			expect(blacklistRow.hidden).toBe(true);
			expect(unblacklistRow.hidden).toBe(false);

			sandbox.window.Dashboard.selectedGuildId = null;
			sandbox.window.Dashboard.syncGuildActionsUi();
			expect(nodes.guildActionsBar.hidden).toBe(true);
		});

		it('bindGuildActions opens leave modal and runs with CONFIRM', async () => {
			const { sandbox, nodes } = setupGuildActions();
			sandbox.window.Dashboard.bindGuildActions();

			const leaveHandler = nodes.guildActLeave.addEventListener.mock.calls
				.find((c) => c[0] === 'click')[1];
			leaveHandler();
			expect(nodes.guildModal.hidden).toBe(false);
			expect(nodes.guildModalTitle.textContent).toBe('guilds.modalLeaveTitle');
			expect(nodes.guildModalSub.textContent).toBe('guilds.actLeaveHint');
			expect(nodes.guildModalList.innerHTML).toContain('Alpha');
			expect(nodes.guildModalConfirmWrap.hidden).toBe(false);

			nodes.guildConfirmInput.value = 'nope';
			const submitHandler = nodes.guildModalSubmit.addEventListener.mock.calls
				.find((c) => c[0] === 'click')[1];
			await submitHandler();
			expect(nodes.guildModalError.hidden).toBe(false);
			expect(sandbox.window.Dashboard.api).not.toHaveBeenCalled();

			nodes.guildConfirmInput.value = 'CONFIRM';
			await submitHandler();
			expect(sandbox.window.Dashboard.api).toHaveBeenCalledWith('/api/guilds/leave', expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ guild_ids: ['g1'] }),
			}));
			expect(nodes.guildModalReport.hidden).toBe(false);
			expect(nodes.guildModalReport.textContent).toContain('OK');
		});

		it('broadcast modal posts message and dry_run', async () => {
			const { sandbox, nodes } = setupGuildActions();
			sandbox.window.Dashboard.bindGuildActions();
			const broadcastHandler = nodes.guildActBroadcast.addEventListener.mock.calls
				.find((c) => c[0] === 'click')[1];
			broadcastHandler();
			expect(nodes.guildModalBroadcast.hidden).toBe(false);
			expect(nodes.guildModalConfirmWrap.hidden).toBe(true);
			nodes.guildBroadcastMsg.value = 'hello';
			nodes.guildBroadcastDry.checked = true;

			const submitHandler = nodes.guildModalSubmit.addEventListener.mock.calls
				.find((c) => c[0] === 'click')[1];
			await submitHandler();
			expect(sandbox.window.Dashboard.api).toHaveBeenCalledWith('/api/guilds/broadcast', {
				method: 'POST',
				body: JSON.stringify({
					guild_ids: ['g1'],
					message: 'hello',
					dry_run: true,
				}),
			});
		});

		it('blocked table unblacklist opens confirm modal', () => {
			const { sandbox, nodes } = setupGuildActions();
			sandbox.window.Dashboard.bindGuildActions();
			const clickHandler = nodes.blocked.addEventListener.mock.calls
				.find((c) => c[0] === 'click')[1];
			clickHandler({
				target: {
					closest: () => ({
						disabled: false,
						getAttribute: () => 'g2',
					}),
				},
			});
			expect(nodes.guildModal.hidden).toBe(false);
			expect(nodes.guildModalTitle.textContent).toBe('guilds.modalUnblacklistTitle');
			expect(nodes.guildModalList.innerHTML).toContain('Blocked Two');
			expect(nodes.guildModalConfirmWrap.hidden).toBe(false);
		});
	});
});

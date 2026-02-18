describe('Logs utility', () => {
	let Logs;

	beforeEach(() => {
		jest.resetModules();
		Logs = require('../../utils/logs.js');
	});

	function createInteraction() {
		return {
			client: { logs: new Map() },
			guild: { id: 'guild-123' },
			member: { guild: { id: 'guild-123', name: 'Test Guild' } },
			user: { id: 'user-456', username: 'TestUser' },
			type: 2,
			message: { type: 1, content: 'test content' },
		};
	}

	it('write() appelle appendFileSync', () => {
		const interaction = createInteraction();
		const logs = new Logs(interaction);
		const appendFileSyncSpy = jest.spyOn(require('fs'), 'appendFileSync').mockImplementation(() => undefined);

		logs.write();

		expect(appendFileSyncSpy).toHaveBeenCalled();
		expect(appendFileSyncSpy.mock.calls[0][1]).toMatch(/"actionType":2/);
		appendFileSyncSpy.mockRestore();
	});

	it('getInfos() retourne les infos formatées', () => {
		const interaction = createInteraction();
		const logs = new Logs(interaction);

		const infos = logs.getInfos();

		expect(infos.guildId).toBe('guild-123');
		expect(infos.guildName).toBe('Test Guild');
		expect(infos.userId).toBe('user-456');
		expect(infos.username).toBe('TestUser');
		expect(infos.dateAndHourUTC).toBeDefined();
	});

	it('getMessage() retourne type et content', () => {
		const interaction = createInteraction();
		const logs = new Logs(interaction);

		const msg = logs.getMessage({ type: 0, content: 'hello' });

		expect(msg).toEqual({ type: 0, content: 'hello' });
	});

	it('getMessage() gère message null', () => {
		const interaction = createInteraction();
		const logs = new Logs(interaction);

		const msg = logs.getMessage(null);

		expect(msg).toEqual({ type: undefined, content: undefined });
	});

	it('clear() réinitialise le fichier', () => {
		const interaction = createInteraction();
		const logs = new Logs(interaction);
		const writeFileSyncSpy = jest.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => undefined);

		logs.clear();

		expect(writeFileSyncSpy).toHaveBeenCalledWith(expect.stringContaining('guild-123'), '', 'utf-8');
		writeFileSyncSpy.mockRestore();
	});
});

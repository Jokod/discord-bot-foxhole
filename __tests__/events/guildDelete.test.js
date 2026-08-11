'use strict';

jest.mock('../../utils/guildCleanup.js', () => ({
	cleanupGuildData: jest.fn(),
}));

const { cleanupGuildData } = require('../../utils/guildCleanup.js');
const guildDelete = require('../../events/guildDelete.js');

describe('guildDelete event', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'log').mockImplementation(() => undefined);
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		console.log.mockRestore();
		console.error.mockRestore();
	});

	it('nettoie les données du serveur', async () => {
		cleanupGuildData.mockResolvedValue(undefined);
		const guild = {
			id: 'g-gone',
			name: 'Gone Guild',
			ownerId: 'owner-9',
		};

		await guildDelete.execute(guild);

		expect(cleanupGuildData).toHaveBeenCalledWith('g-gone', {
			reason: 'guild_delete',
			markLeftAt: true,
			guildName: 'Gone Guild',
			ownerId: 'owner-9',
		});
		expect(console.log).toHaveBeenCalled();
	});

	it('utilise guild.id dans le log si name absent', async () => {
		cleanupGuildData.mockResolvedValue(undefined);
		await guildDelete.execute({ id: 'g-anon', name: null, ownerId: null });
		expect(cleanupGuildData).toHaveBeenCalledWith('g-anon', expect.objectContaining({
			guildName: 'g-anon',
			ownerId: null,
		}));
		expect(console.log).toHaveBeenCalledWith(
			expect.stringContaining('g-anon'),
		);
	});

	it('log une erreur si cleanup échoue', async () => {
		cleanupGuildData.mockRejectedValue(new Error('db down'));
		const guild = { id: 'g-err', name: null, ownerId: null };

		await guildDelete.execute(guild);

		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining('[Stats]'),
			'db down',
		);
	});
});

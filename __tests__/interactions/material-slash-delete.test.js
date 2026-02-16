const materialSlash = require('../../interactions/slash/logistics/material.js');

jest.mock('../../data/models.js', () => ({
	Group: { findOne: jest.fn() },
	Material: {
		findOne: jest.fn(),
		deleteOne: jest.fn(),
		create: jest.fn(),
		updateOne: jest.fn(),
	},
	Stats: { findOneAndUpdate: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../../utils/translations.js', () => {
	return jest.fn().mockImplementation(() => ({
		translate: jest.fn((key) => {
			const t = {
				MATERIAL_NOT_EXIST: 'Ce matériel n\'existe pas.',
				MATERIAL_DELETE_SUCCESS: 'Matériel supprimé.',
			};
			return t[key] || key;
		}),
	}));
});

const { Material } = require('../../data/models.js');

function createInteraction(subcommand, options = {}) {
	const getString = jest.fn((name) => options[name] ?? null);
	const getSubcommand = jest.fn(() => subcommand);
	const mockMessageDelete = jest.fn().mockResolvedValue(undefined);
	const mockFetchMessage = jest.fn().mockResolvedValue({ delete: mockMessageDelete });
	return {
		client: {},
		guild: { id: 'guild-1' },
		options: { getString, getSubcommand },
		channel: {
			parentId: null,
			messages: { fetch: mockFetchMessage },
		},
		reply: jest.fn().mockResolvedValue(undefined),
		getString,
		getSubcommand,
		_mockMessageDelete: mockMessageDelete,
		_mockFetchMessage: mockFetchMessage,
	};
}

describe('Slash /material delete', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('replies MATERIAL_NOT_EXIST when material is not in DB', async () => {
		Material.findOne.mockResolvedValue(null);
		const interaction = createInteraction('delete', { material: '123456789' });

		await materialSlash.execute(interaction);

		expect(Material.findOne).toHaveBeenCalledWith({
			guild_id: 'guild-1',
			material_id: '123456789',
		});
		expect(Material.deleteOne).not.toHaveBeenCalled();
		expect(interaction.channel.messages.fetch).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'Ce matériel n\'existe pas.',
			flags: 64,
		});
	});

	it('deletes material in DB then fetches and deletes the Discord message', async () => {
		Material.findOne.mockResolvedValue({ material_id: 'msg-123' });
		Material.deleteOne.mockResolvedValue({ deletedCount: 1 });
		const interaction = createInteraction('delete', { material: 'msg-123' });

		await materialSlash.execute(interaction);

		expect(Material.deleteOne).toHaveBeenCalledWith({
			guild_id: 'guild-1',
			material_id: 'msg-123',
		});
		expect(interaction.channel.messages.fetch).toHaveBeenCalledWith('msg-123');
		expect(interaction._mockMessageDelete).toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'Matériel supprimé.',
			flags: 64,
		});
	});

	it('replies MATERIAL_DELETE_SUCCESS even when message fetch fails (message already deleted or in another channel)', async () => {
		Material.findOne.mockResolvedValue({ material_id: 'msg-456' });
		Material.deleteOne.mockResolvedValue({ deletedCount: 1 });
		const interaction = createInteraction('delete', { material: 'msg-456' });
		interaction.channel.messages.fetch.mockRejectedValue(new Error('Unknown Message'));

		await materialSlash.execute(interaction);

		expect(Material.deleteOne).toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'Matériel supprimé.',
			flags: 64,
		});
	});

	it('extracts message ID from Discord link and deletes material and message', async () => {
		Material.findOne.mockResolvedValue({ material_id: '999888777666555444' });
		Material.deleteOne.mockResolvedValue({ deletedCount: 1 });
		const link = 'https://discord.com/channels/111/222/999888777666555444';
		const interaction = createInteraction('delete', { material: link });

		await materialSlash.execute(interaction);

		expect(Material.deleteOne).toHaveBeenCalledWith({
			guild_id: 'guild-1',
			material_id: '999888777666555444',
		});
		expect(interaction.channel.messages.fetch).toHaveBeenCalledWith('999888777666555444');
		expect(interaction.reply).toHaveBeenCalledWith({
			content: 'Matériel supprimé.',
			flags: 64,
		});
	});
});

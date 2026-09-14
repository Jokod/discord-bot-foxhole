const mockTranslate = jest.fn((key, params = {}) => (params.id ? `${key}#${params.id}` : key));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/colors.js', () => ({ getRandomColor: jest.fn().mockReturnValue(0xabcdef) }));
jest.mock('../../utils/formatLocation.js', () => ({ formatForDisplay: (x) => x || '' }));

const mockBuildStockpileListPayload = jest.fn();
jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListPayload: (...args) => mockBuildStockpileListPayload(...args),
}));

const mockStockpileFindOne = jest.fn();
jest.mock('../../data/models.js', () => ({
	Stockpile: {
		findOne: (...args) => mockStockpileFindOne(...args),
		find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn() }), lean: jest.fn() }),
		deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
	},
}));

const Stockpile = require('../../data/models.js').Stockpile;
const resetHandler = require('../../interactions/buttons/stockpile/reset.js');

const { v2Text } = require('../../utils/componentsV2.js');
const { MessageFlags } = require('discord.js');

describe('Stockpile reset button', () => {
	let interaction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockBuildStockpileListPayload.mockResolvedValue(v2Text('list'));
		interaction = {
			client: { traductions: new Map() },
			guild: { id: 'guild-123' },
			customId: 'stockpile_reset-1',
			deferUpdate: jest.fn().mockResolvedValue(undefined),
			editReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
		};
	});

	it('a la structure correcte', () => {
		expect(resetHandler.id).toBe('stockpile_reset');
		expect(typeof resetHandler.execute).toBe('function');
	});

	it('répond STOCKPILE_INVALID_ID si l\'id est manquant ou invalide', async () => {
		interaction.customId = 'stockpile_reset-';
		await resetHandler.execute(interaction);
		expect(mockStockpileFindOne).not.toHaveBeenCalled();
		expect(interaction.followUp).toHaveBeenCalledWith(v2Text('STOCKPILE_INVALID_ID', { ephemeral: true }));

		interaction.customId = 'stockpile_reset-abc';
		await resetHandler.execute(interaction);
		expect(interaction.followUp).toHaveBeenCalledWith(v2Text('STOCKPILE_INVALID_ID', { ephemeral: true }));
	});

	it('répond STOCKPILE_NOT_EXIST si le stock n\'existe pas', async () => {
		mockStockpileFindOne.mockResolvedValue(null);
		await resetHandler.execute(interaction);
		expect(mockStockpileFindOne).toHaveBeenCalledWith({ server_id: 'guild-123', id: '1' });
		expect(interaction.followUp).toHaveBeenCalledWith(v2Text('STOCKPILE_NOT_EXIST', { ephemeral: true }));
	});

	it('résout un stock via son ObjectId MongoDB', async () => {
		interaction.customId = 'stockpile_reset-507f1f77bcf86cd799439011';
		const doc = {
			server_id: 'guild-123',
			id: '1',
			deleted: false,
			lastResetAt: null,
			expiresAt: null,
			expiry_reminders_sent: [],
			save: jest.fn().mockResolvedValue(undefined),
		};
		mockStockpileFindOne.mockResolvedValue(doc);

		await resetHandler.execute(interaction);

		expect(mockStockpileFindOne).toHaveBeenCalledWith({
			_id: '507f1f77bcf86cd799439011',
			server_id: 'guild-123',
		});
		expect(doc.save).toHaveBeenCalled();
	});

	it('répond STOCKPILE_ALREADY_DELETED si le stock est marqué supprimé', async () => {
		const doc = { server_id: 'guild-123', id: '1', deleted: true, save: jest.fn() };
		mockStockpileFindOne.mockResolvedValue(doc);
		await resetHandler.execute(interaction);
		expect(doc.save).not.toHaveBeenCalled();
		expect(interaction.followUp).toHaveBeenCalledWith(v2Text('STOCKPILE_ALREADY_DELETED', { ephemeral: true }));
	});

	it('reset le stock, met à jour la liste et envoie STOCKPILE_RESET_SUCCESS', async () => {
		const doc = {
			server_id: 'guild-123',
			id: '1',
			deleted: false,
			lastResetAt: null,
			expiresAt: null,
			expiry_reminders_sent: ['12h'],
			save: jest.fn().mockResolvedValue(undefined),
		};
		mockStockpileFindOne.mockResolvedValue(doc);
		const payload = {
			flags: MessageFlags.IsComponentsV2,
			components: [{ toJSON: () => ({ type: 10, content: 'body' }) }],
		};
		mockBuildStockpileListPayload.mockResolvedValue(payload);

		await resetHandler.execute(interaction);

		expect(doc.lastResetAt).toBeInstanceOf(Date);
		expect(doc.expiresAt).toBeInstanceOf(Date);
		expect(doc.expiry_reminders_sent).toEqual([]);
		expect(doc.save).toHaveBeenCalled();
		expect(mockBuildStockpileListPayload).toHaveBeenCalledWith(Stockpile, 'guild-123', expect.anything());
		expect(interaction.editReply).toHaveBeenCalledWith(payload);
		expect(interaction.followUp).toHaveBeenCalledWith(v2Text('STOCKPILE_RESET_SUCCESS#1', { ephemeral: true }));
	});

	it('met à jour avec liste vide si isEmpty', async () => {
		const doc = {
			server_id: 'guild-123',
			id: '1',
			deleted: false,
			save: jest.fn().mockResolvedValue(undefined),
		};
		mockStockpileFindOne.mockResolvedValue(doc);
		mockBuildStockpileListPayload.mockResolvedValue(v2Text('STOCKPILE_LIST_EMPTY'));

		await resetHandler.execute(interaction);

		expect(interaction.editReply).toHaveBeenCalledWith(v2Text('STOCKPILE_LIST_EMPTY'));
	});
});

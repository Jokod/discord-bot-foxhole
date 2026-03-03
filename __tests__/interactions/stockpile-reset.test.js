const mockTranslate = jest.fn((key, params = {}) => (params.id ? `${key}#${params.id}` : key));

jest.mock('../../utils/translations.js', () => jest.fn().mockImplementation(() => ({ translate: mockTranslate })));
jest.mock('../../utils/colors.js', () => ({ getRandomColor: jest.fn().mockReturnValue(0xabcdef) }));
jest.mock('../../utils/formatLocation.js', () => ({ formatForDisplay: (x) => x || '' }));

const mockBuildStockpileListEmbed = jest.fn();
const mockBuildStockpileListComponents = jest.fn().mockResolvedValue([]);
jest.mock('../../interactions/embeds/stockpileList.js', () => ({
	buildStockpileListEmbed: mockBuildStockpileListEmbed,
	buildStockpileListComponents: mockBuildStockpileListComponents,
}));

const mockStockpileFindOne = jest.fn();
const mockStockpileFind = jest.fn();
jest.mock('../../data/models.js', () => ({
	Stockpile: {
		findOne: (...args) => mockStockpileFindOne(...args),
		find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn() }), lean: jest.fn() }),
		deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
	},
}));

const Stockpile = require('../../data/models.js').Stockpile;
const resetHandler = require('../../interactions/buttons/stockpile/reset.js');

describe('Stockpile reset button', () => {
	let interaction;

	beforeEach(() => {
		jest.clearAllMocks();
		interaction = {
			client: { traductions: new Map() },
			guild: { id: 'guild-123' },
			customId: 'stockpile_reset-1',
			reply: jest.fn().mockResolvedValue(undefined),
			update: jest.fn().mockResolvedValue(undefined),
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
		expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'STOCKPILE_INVALID_ID', flags: 64 }));

		interaction.customId = 'stockpile_reset-abc';
		await resetHandler.execute(interaction);
		expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'STOCKPILE_INVALID_ID', flags: 64 }));
	});

	it('répond STOCKPILE_NOT_EXIST si le stock n\'existe pas', async () => {
		mockStockpileFindOne.mockResolvedValue(null);
		await resetHandler.execute(interaction);
		expect(mockStockpileFindOne).toHaveBeenCalledWith({ server_id: 'guild-123', id: '1' });
		expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'STOCKPILE_NOT_EXIST', flags: 64 }));
	});

	it('répond STOCKPILE_ALREADY_DELETED si le stock est marqué supprimé', async () => {
		const doc = { server_id: 'guild-123', id: '1', deleted: true, save: jest.fn() };
		mockStockpileFindOne.mockResolvedValue(doc);
		await resetHandler.execute(interaction);
		expect(doc.save).not.toHaveBeenCalled();
		expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'STOCKPILE_ALREADY_DELETED', flags: 64 }));
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
		mockBuildStockpileListEmbed.mockResolvedValue({
			embed: { toJSON: () => ({}) },
			isEmpty: false,
		});
		mockBuildStockpileListComponents.mockResolvedValue([{ components: [] }]);

		await resetHandler.execute(interaction);

		expect(doc.lastResetAt).toBeInstanceOf(Date);
		expect(doc.expiresAt).toBeInstanceOf(Date);
		expect(doc.expiry_reminders_sent).toEqual([]);
		expect(doc.save).toHaveBeenCalled();
		expect(mockBuildStockpileListEmbed).toHaveBeenCalledWith(Stockpile, 'guild-123', expect.anything());
		expect(mockBuildStockpileListComponents).toHaveBeenCalledWith(Stockpile, 'guild-123');
		expect(interaction.update).toHaveBeenCalledWith(expect.objectContaining({ embeds: [expect.anything()] }));
		expect(interaction.followUp).toHaveBeenCalledWith(expect.objectContaining({ content: 'STOCKPILE_RESET_SUCCESS#1', flags: 64 }));
	});

	it('met à jour avec liste vide si isEmpty', async () => {
		const doc = {
			server_id: 'guild-123',
			id: '1',
			deleted: false,
			save: jest.fn().mockResolvedValue(undefined),
		};
		mockStockpileFindOne.mockResolvedValue(doc);
		mockBuildStockpileListEmbed.mockResolvedValue({ embed: null, isEmpty: true });

		await resetHandler.execute(interaction);

		expect(interaction.update).toHaveBeenCalledWith({
			content: 'STOCKPILE_LIST_EMPTY',
			embeds: [],
			components: [],
		});
		expect(mockBuildStockpileListComponents).not.toHaveBeenCalled();
	});
});

const mockStockpileFind = jest.fn();

jest.mock('../../data/models.js', () => ({
	Stockpile: {
		find: jest.fn().mockReturnValue({
			limit: jest.fn().mockReturnValue({
				lean: jest.fn(),
			}),
		}),
	},
}));

const { Stockpile } = require('../../data/models.js');

describe('Autocomplete stockpile', () => {
	let stockpileAutocomplete;

	beforeEach(() => {
		jest.clearAllMocks();
		const findChain = {
			limit: jest.fn().mockReturnValue({ lean: jest.fn() }),
		};
		Stockpile.find.mockReturnValue(findChain);
		stockpileAutocomplete = require('../../interactions/autocomplete/stockpile.js');
	});

	function createInteraction(subcommand, focusedName, focusedValue = '') {
		const respond = jest.fn().mockResolvedValue(undefined);
		return {
			guild: { id: 'guild-123' },
			options: {
				getSubcommand: () => subcommand,
				getFocused: () => ({ name: focusedName, value: focusedValue }),
			},
			respond,
		};
	}

	it('répond [] si l\'option focusée n\'est pas "id"', async () => {
		const interaction = createInteraction('list', 'other_option');

		await stockpileAutocomplete.execute(interaction);

		expect(Stockpile.find).not.toHaveBeenCalled();
		expect(interaction.respond).toHaveBeenCalledWith([]);
	});

	it('filtre par deleted=false pour remove et reset', async () => {
		const leanMock = jest.fn().mockResolvedValue([{ id: '1', name: 'Depot A' }]);
		Stockpile.find.mockReturnValue({ limit: () => ({ lean: leanMock }) });
		const interaction = createInteraction('remove', 'id', 'depot');

		await stockpileAutocomplete.execute(interaction);

		expect(Stockpile.find).toHaveBeenCalledWith({ server_id: 'guild-123', deleted: false });
		expect(interaction.respond).toHaveBeenCalledWith([
			{ name: 'Depot A (#1)', value: '1' },
		]);
	});

	it('filtre par deleted=true pour restore', async () => {
		const leanMock = jest.fn().mockResolvedValue([{ id: '2', name: 'Old Depot' }]);
		Stockpile.find.mockReturnValue({ limit: () => ({ lean: leanMock }) });
		const interaction = createInteraction('restore', 'id', '');

		await stockpileAutocomplete.execute(interaction);

		expect(Stockpile.find).toHaveBeenCalledWith({ server_id: 'guild-123', deleted: true });
	});

	it('retourne les matches filtrés par query (name ou id)', async () => {
		const leanMock = jest.fn().mockResolvedValue([
			{ id: '1', name: 'Alpha Depot' },
			{ id: '2', name: 'Beta Depot' },
		]);
		Stockpile.find.mockReturnValue({ limit: () => ({ lean: leanMock }) });
		const interaction = createInteraction('list', 'id', 'alpha');

		await stockpileAutocomplete.execute(interaction);

		expect(interaction.respond).toHaveBeenCalledWith([
			{ name: 'Alpha Depot (#1)', value: '1' },
		]);
	});

	it('limite à 25 résultats', async () => {
		const many = Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: `Depot ${i}` }));
		const leanMock = jest.fn().mockResolvedValue(many);
		Stockpile.find.mockReturnValue({ limit: () => ({ lean: leanMock }) });
		const interaction = createInteraction('list', 'id', '');

		await stockpileAutocomplete.execute(interaction);

		expect(interaction.respond).toHaveBeenCalled();
		const matches = interaction.respond.mock.calls[0][0];
		expect(matches.length).toBe(25);
	});
});

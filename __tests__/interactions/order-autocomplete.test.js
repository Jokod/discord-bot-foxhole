jest.mock('../../data/models.js', () => ({
	OrderBoard: {
		find: jest.fn(),
	},
	Operation: {
		find: jest.fn(),
	},
}));

const { OrderBoard, Operation } = require('../../data/models.js');
const autocomplete = require('../../interactions/autocomplete/order.js');

describe('Autocomplete /order', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	function interaction(focusedName, value = '') {
		return {
			guild: { id: 'g1' },
			channel: { id: 'c1' },
			options: {
				getFocused: () => ({ name: focusedName, value }),
			},
			respond: jest.fn().mockResolvedValue(undefined),
		};
	}

	it('suggère les boards du salon pour name', async () => {
		OrderBoard.find.mockReturnValue({
			select: () => ({
				sort: () => ({
					limit: () => ({
						lean: () => Promise.resolve([{ name: 'Alpha' }, { name: 'Beta' }]),
					}),
				}),
			}),
		});
		const i = interaction('name', 'a');
		await autocomplete.execute(i);
		expect(i.respond).toHaveBeenCalledWith([
			{ name: 'Alpha', value: 'Alpha' },
			{ name: 'Beta', value: 'Beta' },
		]);
	});

	it('suggère les opérations actives pour operation', async () => {
		Operation.find.mockReturnValue({
			sort: () => ({
				limit: () => ({
					lean: () => Promise.resolve([
						{ title: 'Raid', operation_id: 'op1', status: 'pending' },
					]),
				}),
			}),
		});
		const i = interaction('operation', 'rai');
		await autocomplete.execute(i);
		expect(Operation.find).toHaveBeenCalledWith(expect.objectContaining({
			guild_id: 'g1',
			status: { $in: ['pending', 'started'] },
		}));
		expect(i.respond).toHaveBeenCalledWith([
			{ name: '⏳ Raid', value: 'op1' },
		]);
	});

	it('répond [] pour champ inconnu', async () => {
		const i = interaction('other');
		await autocomplete.execute(i);
		expect(i.respond).toHaveBeenCalledWith([]);
	});
});

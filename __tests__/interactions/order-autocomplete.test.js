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

	it('liste tous les boards sans filtre query vide', async () => {
		OrderBoard.find.mockReturnValue({
			select: () => ({
				sort: () => ({
					limit: () => ({
						lean: () => Promise.resolve([{ name: 'Alpha' }]),
					}),
				}),
			}),
		});
		const i = interaction('name', '');
		await autocomplete.execute(i);
		expect(OrderBoard.find).toHaveBeenCalledWith({ guild_id: 'g1', channel_id: 'c1' });
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

	it('répond [] pour name sans guild ou channel', async () => {
		const i = {
			guild: null,
			channel: null,
			options: { getFocused: () => ({ name: 'name', value: '' }) },
			respond: jest.fn().mockResolvedValue(undefined),
		};
		await autocomplete.execute(i);
		expect(i.respond).toHaveBeenCalledWith([]);
		expect(OrderBoard.find).not.toHaveBeenCalled();
	});

	it('filtre les boards par query regex', async () => {
		OrderBoard.find.mockReturnValue({
			select: () => ({
				sort: () => ({
					limit: () => ({
						lean: () => Promise.resolve([{ name: 'Alpha Raid' }]),
					}),
				}),
			}),
		});
		const i = interaction('name', 'raid+');
		await autocomplete.execute(i);
		expect(OrderBoard.find).toHaveBeenCalledWith(expect.objectContaining({
			guild_id: 'g1',
			channel_id: 'c1',
			name: { $regex: 'raid\\+', $options: 'i' },
		}));
	});

	it('répond [] pour operation sans guild', async () => {
		const i = {
			guild: null,
			channel: { id: 'c1' },
			options: { getFocused: () => ({ name: 'operation', value: 'op' }) },
			respond: jest.fn().mockResolvedValue(undefined),
		};
		await autocomplete.execute(i);
		expect(i.respond).toHaveBeenCalledWith([]);
	});

	it('filtre les opérations et affiche ▶ pour started', async () => {
		Operation.find.mockReturnValue({
			sort: () => ({
				limit: () => ({
					lean: () => Promise.resolve([
						{ title: 'Raid Live', operation_id: 'op-live', status: 'started' },
					]),
				}),
			}),
		});
		const i = interaction('operation', 'live');
		await autocomplete.execute(i);
		expect(Operation.find).toHaveBeenCalledWith(expect.objectContaining({
			guild_id: 'g1',
			$and: expect.any(Array),
		}));
		expect(i.respond).toHaveBeenCalledWith([
			{ name: '▶ Raid Live', value: 'op-live' },
		]);
	});

	it('utilise OP si titre opération absent', async () => {
		Operation.find.mockReturnValue({
			sort: () => ({
				limit: () => ({
					lean: () => Promise.resolve([
						{ title: null, operation_id: 'op1', status: 'pending' },
					]),
				}),
			}),
		});
		const i = interaction('operation', '');
		await autocomplete.execute(i);
		expect(i.respond).toHaveBeenCalledWith([
			{ name: '⏳ OP', value: 'op1' },
		]);
	});
});

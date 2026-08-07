const OrderBoard = require('../../../data/models/logistic/orderBoard.js');
const OrderLine = require('../../../data/models/logistic/orderLine.js');

describe('OrderBoard Model', () => {
	it('should require guild_id, name, channel_id, owner_id, kind', () => {
		const doc = new OrderBoard();
		const err = doc.validateSync();
		expect(err.errors.guild_id).toBeDefined();
		expect(err.errors.name).toBeDefined();
		expect(err.errors.channel_id).toBeDefined();
		expect(err.errors.owner_id).toBeDefined();
		expect(err.errors.kind).toBeDefined();
	});

	it('should create a valid prod board', () => {
		const doc = new OrderBoard({
			guild_id: 'g1',
			name: 'OP sticky',
			channel_id: 'c1',
			owner_id: 'u1',
			kind: 'prod',
		});
		expect(doc.validateSync()).toBeUndefined();
		expect(doc.status).toBe('open');
		expect(doc.page).toBe(0);
	});

	it('should unique by guild+channel+name', () => {
		const indexes = OrderBoard.schema.indexes();
		const uniqueName = indexes.some((entry) => {
			const [fields, opts] = Array.isArray(entry) ? entry : [entry, {}];
			return fields.guild_id === 1
				&& fields.channel_id === 1
				&& fields.name === 1
				&& opts?.unique === true;
		});
		expect(uniqueName).toBe(true);
	});

	it('should accept scrap kind', () => {
		const doc = new OrderBoard({
			guild_id: 'g1',
			name: 'Farm North',
			channel_id: 'c1',
			owner_id: 'u1',
			kind: 'scrap',
		});
		expect(doc.validateSync()).toBeUndefined();
		expect(doc.kind).toBe('scrap');
	});

	it('should accept transfer kind', () => {
		const doc = new OrderBoard({
			guild_id: 'g1',
			name: 'Haul',
			channel_id: 'c1',
			owner_id: 'u1',
			kind: 'transfer',
			operation_id: 'op1',
			from: 'Home Base',
			to: 'Front',
		});
		expect(doc.validateSync()).toBeUndefined();
		expect(doc.kind).toBe('transfer');
		expect(doc.operation_id).toBe('op1');
		expect(doc.from).toBe('Home Base');
		expect(doc.to).toBe('Front');
	});
});

describe('OrderLine Model', () => {
	it('should require line_id, guild_id, board_id', () => {
		const doc = new OrderLine();
		const err = doc.validateSync();
		expect(err.errors.line_id).toBeDefined();
		expect(err.errors.guild_id).toBeDefined();
		expect(err.errors.board_id).toBeDefined();
	});

	it('should default current/target to 0', () => {
		const doc = new OrderLine({
			line_id: '1',
			guild_id: 'g1',
			board_id: 'b1',
			name: 'Sticky Bomb',
		});
		expect(doc.validateSync()).toBeUndefined();
		expect(doc.current).toBe(0);
		expect(doc.target).toBe(0);
		expect(doc.priority).toBe('neutral');
	});
});

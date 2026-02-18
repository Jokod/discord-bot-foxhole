const mockLogsWrite = jest.fn();
jest.mock('../../utils/logs.js', () => class Logs {
	constructor(interaction) {
		this.interaction = interaction;
	}
	write() { return mockLogsWrite(); }
});

describe('getInteraction event', () => {
	let getInteraction;

	beforeEach(() => {
		jest.clearAllMocks();
		getInteraction = require('../../events/getInteraction.js');
	});

	it('appelle Logs.write avec l\'interaction', async () => {
		const interaction = { guild: { id: 'g1' }, member: {}, user: {}, message: {} };

		await getInteraction.execute(interaction);

		expect(mockLogsWrite).toHaveBeenCalled();
	});
});

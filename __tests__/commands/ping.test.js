describe('Commande ping', () => {
	let pingCommand;

	beforeEach(() => {
		jest.resetModules();
		pingCommand = require('../../commands/misc/ping.js');
	});

	it('exporte un module avec name et execute', () => {
		expect(pingCommand.name).toBe('ping');
		expect(typeof pingCommand.execute).toBe('function');
	});

	it('envoie "Pong." dans le canal', () => {
		const send = jest.fn().mockResolvedValue(undefined);
		const message = { channel: { send } };

		pingCommand.execute(message);

		expect(send).toHaveBeenCalledWith({ content: 'Pong.' });
	});
});

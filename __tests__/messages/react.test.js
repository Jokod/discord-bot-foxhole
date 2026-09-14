const react = require('../../messages/react.js');

describe('messages/react', () => {
	beforeEach(() => {
		jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('ajoute les trois réactions', async () => {
		const message = {
			channelId: 'c1',
			react: jest.fn().mockResolvedValue(undefined),
		};
		await react.execute(message);
		expect(message.react).toHaveBeenCalledTimes(3);
		expect(message.react).toHaveBeenNthCalledWith(1, '🟢');
		expect(message.react).toHaveBeenNthCalledWith(2, '🟠');
		expect(message.react).toHaveBeenNthCalledWith(3, '🔴');
	});

	it('arrête silencieusement sur Missing Access', async () => {
		const message = {
			channelId: 'c1',
			react: jest.fn().mockRejectedValue({ code: 50001, message: 'Missing Access' }),
		};
		await expect(react.execute(message)).resolves.toBeUndefined();
		expect(message.react).toHaveBeenCalledTimes(1);
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('c1'));
	});

	it('arrête silencieusement sur HTTP 403', async () => {
		const message = {
			channelId: 'c1',
			react: jest.fn().mockRejectedValue({ status: 403, message: 'Forbidden' }),
		};
		await expect(react.execute(message)).resolves.toBeUndefined();
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('code 403'));
	});

	it('relance les autres erreurs', async () => {
		const err = new Error('network');
		const message = {
			channelId: 'c1',
			react: jest.fn().mockRejectedValue(err),
		};
		await expect(react.execute(message)).rejects.toThrow('network');
	});
});

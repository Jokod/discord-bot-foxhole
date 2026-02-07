const mongoose = require('mongoose');

// Import le modèle
const Server = require('../../../data/models/server/server');

describe('Server Model', () => {
	describe('Schema', () => {
		it('should have required fields', () => {
			const server = new Server();
			const validationError = server.validateSync();

			expect(validationError.errors.guild_id).toBeDefined();
			expect(validationError.errors.lang).toBeDefined();
			expect(validationError.errors.camp).toBeDefined();
		});

		it('should create a valid server document', () => {
			const serverData = {
				guild_id: '123456789',
				lang: 'en',
				camp: 'colonial',
			};

			const server = new Server(serverData);
			const validationError = server.validateSync();

			expect(validationError).toBeUndefined();
			expect(server.guild_id).toBe(serverData.guild_id);
			expect(server.lang).toBe(serverData.lang);
			expect(server.camp).toBe(serverData.camp);
		});

		it('should enforce unique guild_id', () => {
			const schema = Server.schema;
			const guildIdPath = schema.path('guild_id');

			expect(guildIdPath.options.unique).toBe(true);
		});

		it('should have correct field types', () => {
			const schema = Server.schema;

			expect(schema.path('guild_id').instance).toBe('String');
			expect(schema.path('lang').instance).toBe('String');
			expect(schema.path('camp').instance).toBe('String');
		});
	});
});

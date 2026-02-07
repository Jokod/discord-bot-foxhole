const mongoose = require('mongoose');

const Operation = require('../../../data/models/operation');

describe('Operation Model', () => {
	describe('Schema', () => {
		it('should have required fields', () => {
			const operation = new Operation();
			const validationError = operation.validateSync();

			expect(validationError.errors.title).toBeDefined();
			expect(validationError.errors.guild_id).toBeDefined();
			expect(validationError.errors.operation_id).toBeDefined();
			expect(validationError.errors.owner_id).toBeDefined();
			expect(validationError.errors.status).toBeDefined();
		});

		it('should create a valid operation document', () => {
			const operationData = {
				title: 'Operation Alpha',
				guild_id: '123456789',
				operation_id: 'op123',
				owner_id: '987654321',
				numberOfGroups: 5,
				date: '01/01/2026',
				time: '14:00',
				duration: 120,
				description: 'A test operation',
				status: 'pending',
			};

			const operation = new Operation(operationData);
			const validationError = operation.validateSync();

			expect(validationError).toBeUndefined();
			expect(operation.title).toBe(operationData.title);
			expect(operation.guild_id).toBe(operationData.guild_id);
			expect(operation.operation_id).toBe(operationData.operation_id);
			expect(operation.owner_id).toBe(operationData.owner_id);
			expect(operation.numberOfGroups).toBe(operationData.numberOfGroups);
			expect(operation.status).toBe(operationData.status);
		});

		it('should have default value for numberOfGroups', () => {
			const operationData = {
				title: 'Operation Beta',
				guild_id: '123456789',
				operation_id: 'op124',
				owner_id: '987654321',
				status: 'pending',
			};

			const operation = new Operation(operationData);
			expect(operation.numberOfGroups).toBe(0);
		});

		it('should enforce unique operation_id', () => {
			const schema = Operation.schema;
			const operationIdPath = schema.path('operation_id');

			expect(operationIdPath.options.unique).toBe(true);
		});

		it('should have correct field types', () => {
			const schema = Operation.schema;

			expect(schema.path('title').instance).toBe('String');
			expect(schema.path('guild_id').instance).toBe('String');
			expect(schema.path('operation_id').instance).toBe('String');
			expect(schema.path('owner_id').instance).toBe('String');
			expect(schema.path('numberOfGroups').instance).toBe('Number');
			expect(schema.path('date').instance).toBe('String');
			expect(schema.path('time').instance).toBe('String');
			expect(schema.path('duration').instance).toBe('Number');
			expect(schema.path('description').instance).toBe('String');
			expect(schema.path('status').instance).toBe('String');
		});
	});
});

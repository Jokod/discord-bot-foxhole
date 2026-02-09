const Stats = require('../../../data/models/stats/stats');

describe('Stats Model', () => {
	describe('Schema', () => {
		it('should have required field guild_id', () => {
			const stats = new Stats();
			const validationError = stats.validateSync();

			expect(validationError).toBeDefined();
			expect(validationError.errors.guild_id).toBeDefined();
		});

		it('should create a valid stats document with only guild_id', () => {
			const statsData = { guild_id: '123456789' };

			const stats = new Stats(statsData);
			const validationError = stats.validateSync();

			expect(validationError).toBeUndefined();
			expect(stats.guild_id).toBe(statsData.guild_id);
			expect(stats.name).toBe('');
			expect(stats.member_count).toBe(0);
		});

		it('should create a valid stats document with all fields', () => {
			const now = new Date();
			const statsData = {
				guild_id: '987654321',
				name: 'Test Server',
				created_at: now,
				joined_at: now,
				last_command_at: now,
				member_count: 42,
				first_command_at: now,
				command_count: 10,
				last_command_by_type: { help: now, logistics: now },
				command_breakdown: { help: 5, logistics: 5 },
				operation_count: 2,
				material_count: 8,
				material_validated_count: 3,
			};

			const stats = new Stats(statsData);
			const validationError = stats.validateSync();

			expect(validationError).toBeUndefined();
			expect(stats.guild_id).toBe(statsData.guild_id);
			expect(stats.name).toBe(statsData.name);
			expect(stats.member_count).toBe(statsData.member_count);
			expect(stats.command_count).toBe(statsData.command_count);
			expect(stats.operation_count).toBe(statsData.operation_count);
			expect(stats.material_count).toBe(statsData.material_count);
			expect(stats.material_validated_count).toBe(statsData.material_validated_count);
		});

		it('should enforce unique guild_id', () => {
			const schema = Stats.schema;
			const guildIdPath = schema.path('guild_id');

			expect(guildIdPath.options.unique).toBe(true);
		});

		it('should have correct field types', () => {
			const schema = Stats.schema;

			expect(schema.path('guild_id').instance).toBe('String');
			expect(schema.path('name').instance).toBe('String');
			expect(schema.path('created_at').instance).toBe('Date');
			expect(schema.path('joined_at').instance).toBe('Date');
			expect(schema.path('last_command_at').instance).toBe('Date');
			expect(schema.path('member_count').instance).toBe('Number');
			expect(schema.path('first_command_at').instance).toBe('Date');
			expect(schema.path('command_count').instance).toBe('Number');
			expect(schema.path('operation_count').instance).toBe('Number');
			expect(schema.path('material_count').instance).toBe('Number');
			expect(schema.path('material_validated_count').instance).toBe('Number');
		});

		it('should apply default values when fields are omitted', () => {
			const stats = new Stats({ guild_id: '111' });

			expect(stats.name).toBe('');
			expect(stats.member_count).toBe(0);
			expect(stats.command_count).toBe(0);
			expect(stats.operation_count).toBe(0);
			expect(stats.material_count).toBe(0);
			expect(stats.material_validated_count).toBe(0);
			expect(stats.created_at).toBeNull();
			expect(stats.joined_at).toBeNull();
			expect(stats.last_command_at).toBeNull();
			expect(stats.first_command_at).toBeNull();
		});
	});
});

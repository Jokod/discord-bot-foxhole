const { Collection, ApplicationCommandOptionType } = require('discord.js');

describe('Autocomplete /help', () => {
	let helpAutocomplete;

	beforeEach(() => {
		jest.resetModules();
		helpAutocomplete = require('../../interactions/autocomplete/help.js');
	});

	function createClient(slashCommands, lang = 'en') {
		return {
			slashCommands,
			traductions: new Map([['g1', lang]]),
			languages: new Map([['en', {}], ['fr', {}]]),
		};
	}

	it('suggère commandes, sous-commandes et groupes (max 25)', async () => {
		const orderCmd = require('../../interactions/slash/order/order.js');
		const mockGroupCmd = {
			data: {
				toJSON: () => ({
					name: 'grouped',
					description: 'Grouped',
					options: [
						{
							type: ApplicationCommandOptionType.SubcommandGroup,
							name: 'admin',
							name_localizations: { fr: 'admin-fr' },
							options: [
								{
									type: ApplicationCommandOptionType.Subcommand,
									name: 'reset',
									name_localizations: { fr: 'reset-fr' },
									description: 'Reset',
								},
							],
						},
					],
				}),
			},
		};
		const slashCommands = new Collection();
		slashCommands.set('order', orderCmd);
		slashCommands.set('grouped', mockGroupCmd);

		const respond = jest.fn().mockResolvedValue(undefined);
		await helpAutocomplete.execute({
			guild: { id: 'g1' },
			client: createClient(slashCommands),
			options: { getFocused: () => '' },
			respond,
		});

		const choices = respond.mock.calls[0][0];
		expect(choices.length).toBeGreaterThan(0);
		expect(choices.length).toBeLessThanOrEqual(25);
		expect(choices.some((c) => c.value.includes('grouped admin reset'))).toBe(true);
	});

	it('filtre les suggestions selon la requête normalisée', async () => {
		const slashCommands = new Collection();
		slashCommands.set('about', {
			data: {
				toJSON: () => ({ name: 'about', description: 'links', options: [] }),
			},
		});
		slashCommands.set('help', {
			data: {
				toJSON: () => ({ name: 'help', description: 'help', options: [] }),
			},
		});

		const respond = jest.fn().mockResolvedValue(undefined);
		await helpAutocomplete.execute({
			guild: { id: 'g1' },
			client: createClient(slashCommands),
			options: { getFocused: () => 'abo' },
			respond,
		});

		const choices = respond.mock.calls[0][0];
		expect(choices.every((c) => c.value.includes('about') || c.name.toLowerCase().includes('abo'))).toBe(true);
	});

	it('utilise en si la langue courante est absente de languages', async () => {
		const slashCommands = new Collection();
		slashCommands.set('about', {
			data: {
				toJSON: () => ({ name: 'about', description: 'links', options: [] }),
			},
		});

		const respond = jest.fn().mockResolvedValue(undefined);
		await helpAutocomplete.execute({
			guild: { id: 'g1' },
			client: {
				slashCommands,
				traductions: new Map([['g1', 'xx']]),
				languages: new Map([['en', {}]]),
			},
			options: { getFocused: () => '' },
			respond,
		});

		expect(respond).toHaveBeenCalled();
	});

	it('gère guild null et traductions absentes', async () => {
		const slashCommands = new Collection();
		slashCommands.set('about', {
			data: {
				toJSON: () => ({ name: 'about', description: 'links', options: [] }),
			},
		});

		const respond = jest.fn().mockResolvedValue(undefined);
		await helpAutocomplete.execute({
			guild: null,
			client: { slashCommands, languages: new Map([['en', {}]]) },
			options: { getFocused: () => '' },
			respond,
		});

		expect(respond).toHaveBeenCalled();
	});

	it('ignore les options non-subcommand dans un SubcommandGroup', async () => {
		const slashCommands = new Collection();
		slashCommands.set('mixed', {
			data: {
				toJSON: () => ({
					name: 'mixed',
					description: 'Mixed',
					options: [
						{
							type: ApplicationCommandOptionType.SubcommandGroup,
							name: 'grp',
							options: [
								{ type: ApplicationCommandOptionType.String, name: 'notsub', description: 'x' },
								{
									type: ApplicationCommandOptionType.Subcommand,
									name: 'valid',
									description: 'Valid sub',
								},
							],
						},
					],
				}),
			},
		});

		const respond = jest.fn().mockResolvedValue(undefined);
		await helpAutocomplete.execute({
			guild: { id: 'g1' },
			client: createClient(slashCommands),
			options: { getFocused: () => 'valid' },
			respond,
		});

		const choices = respond.mock.calls[0][0];
		expect(choices.some((c) => c.value === 'mixed grp valid')).toBe(true);
		expect(choices.some((c) => c.value.includes('notsub'))).toBe(false);
	});

	it('ignore les options top-level non-subcommand dans collectSuggestions', async () => {
		const slashCommands = new Collection();
		slashCommands.set('topopts', {
			data: {
				toJSON: () => ({
					name: 'topopts',
					description: 'Top opts',
					options: [
						{ type: ApplicationCommandOptionType.String, name: 'query', description: 'q' },
					],
				}),
			},
		});

		const respond = jest.fn().mockResolvedValue(undefined);
		await helpAutocomplete.execute({
			guild: { id: 'g1' },
			client: createClient(slashCommands),
			options: { getFocused: () => '' },
			respond,
		});

		const choices = respond.mock.calls[0][0];
		expect(choices.some((c) => c.value === 'topopts')).toBe(true);
		expect(choices.some((c) => c.value.includes('query'))).toBe(false);
	});

	it('ignore SubcommandGroup sans tableau options', async () => {
		const slashCommands = new Collection();
		slashCommands.set('badgroup', {
			data: {
				toJSON: () => ({
					name: 'badgroup',
					description: 'Bad group',
					options: [
						{ type: ApplicationCommandOptionType.SubcommandGroup, name: 'grp' },
					],
				}),
			},
		});

		const respond = jest.fn().mockResolvedValue(undefined);
		await helpAutocomplete.execute({
			guild: { id: 'g1' },
			client: createClient(slashCommands),
			options: { getFocused: () => '' },
			respond,
		});

		expect(respond.mock.calls[0][0]).toEqual([{ name: '/badgroup', value: 'badgroup' }]);
	});

	it('collectSuggestions avec options undefined sur une commande', async () => {
		const slashCommands = new Collection();
		slashCommands.set('bare', {
			data: { toJSON: () => ({ name: 'bare', description: 'Bare' }) },
		});

		const respond = jest.fn().mockResolvedValue(undefined);
		await helpAutocomplete.execute({
			guild: { id: 'g1' },
			client: createClient(slashCommands),
			options: { getFocused: () => '' },
			respond,
		});

		expect(respond.mock.calls[0][0]).toEqual([{ name: '/bare', value: 'bare' }]);
	});
});

const Translate = require('../../utils/translations');

describe('Translate', () => {
	let mockClient;
	let translate;

	beforeEach(() => {
		mockClient = {
			languages: new Map([
				['en', {
					HELLO: 'Hello',
					WELCOME: 'Welcome %name%',
					GOODBYE: 'Goodbye %name%, see you %when%',
				}],
				['fr', {
					HELLO: 'Bonjour',
					WELCOME: 'Bienvenue %name%',
					GOODBYE: 'Au revoir %name%, à %when%',
				}],
			]),
			traductions: new Map([
				['guild123', 'en'],
				['guild456', 'fr'],
			]),
		};
		translate = new Translate(mockClient, 'guild123');
	});

	describe('constructor', () => {
		it('should initialize with client and guildId', () => {
			expect(translate.client).toBe(mockClient);
			expect(translate.guildId).toBe('guild123');
		});
	});

	describe('translate', () => {
		it('should translate a simple key', () => {
			const result = translate.translate('HELLO');
			expect(result).toBe('Hello');
		});

		it('should translate with parameters', () => {
			const result = translate.translate('WELCOME', { name: 'John' });
			expect(result).toBe('Welcome John');
		});

		it('should translate with multiple parameters', () => {
			const result = translate.translate('GOODBYE', { name: 'John', when: 'tomorrow' });
			expect(result).toBe('Goodbye John, see you tomorrow');
		});

		it('should use French translation for French guild', () => {
			const frTranslate = new Translate(mockClient, 'guild456');
			const result = frTranslate.translate('HELLO');
			expect(result).toBe('Bonjour');
		});

		it('should fallback to English if language not found', () => {
			mockClient.traductions.set('guild789', 'de');
			const deTranslate = new Translate(mockClient, 'guild789');
			const result = deTranslate.translate('HELLO');
			expect(result).toBe('Hello');
		});

		it('should return undefined if translation not found', () => {
			const result = translate.translate('NONEXISTENT_KEY');
			expect(result).toBeUndefined();
		});
	});

	describe('replaceVariables', () => {
		it('should return sentence as is if no params', () => {
			const result = translate.replaceVariables('Hello', {});
			expect(result).toBe('Hello');
		});

		it('should replace single variable', () => {
			const result = translate.replaceVariables('Hello %name%', { name: 'John' });
			expect(result).toBe('Hello John');
		});

		it('should replace multiple variables', () => {
			const result = translate.replaceVariables(
				'Hello %name%, you are %age% years old',
				{ name: 'John', age: '25' },
			);
			expect(result).toBe('Hello John, you are 25 years old');
		});

		it('should replace repeated variables', () => {
			const result = translate.replaceVariables(
				'%name% said: %name% is here',
				{ name: 'John' },
			);
			expect(result).toBe('John said: John is here');
		});
	});

	describe('compareTranslationKeys', () => {
		it('should not report errors when all languages have same keys', () => {
			const consoleSpy = jest.spyOn(console, 'log');
			Translate.prototype.compareTranslationKeys(mockClient);
			expect(consoleSpy).toHaveBeenCalledWith('Aucune erreur dans les fichiers de traduction.');
		});

		it('should report missing keys', () => {
			mockClient.languages.set('fr', { HELLO: 'Bonjour' });
			const consoleSpy = jest.spyOn(console, 'error');
			Translate.prototype.compareTranslationKeys(mockClient);
			expect(consoleSpy).toHaveBeenCalledWith('Clés manquantes :', ['WELCOME', 'GOODBYE']);
		});

		it('should report extra keys', () => {
			mockClient.languages.set('fr', {
				HELLO: 'Bonjour',
				WELCOME: 'Bienvenue %name%',
				GOODBYE: 'Au revoir %name%, à %when%',
				EXTRA_KEY: 'Extra',
			});
			const consoleSpy = jest.spyOn(console, 'error');
			Translate.prototype.compareTranslationKeys(mockClient);
			expect(consoleSpy).toHaveBeenCalledWith('Clés en trop :', ['EXTRA_KEY']);
		});
	});
});

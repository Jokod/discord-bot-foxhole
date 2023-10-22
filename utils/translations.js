class Translate {
	constructor(client, guildID) {
		this.client = client;
		this.guildID = guildID;
	}


	translate(key, params = {}) {
		let lang = this.client.traductions.get(this.guildID);
		if (!this.client.languages.has(lang)) lang = this.client.languages.get('en');

		let sentence = key;
		try {
			sentence = this.client.languages.get(lang)[key];
		}
		catch (e) {
			console.log(`[ERROR] Translation key "${key}" not found.`);
		}

		return this.replaceVariables(sentence, params);
	}

	replaceVariables(sentence, params) {
		if (Object.keys(params).length === 0) return sentence;

		Object.keys(params).forEach(param => {
			const paramRegex = new RegExp(`%${param}%`, 'g');
			sentence = sentence.replace(paramRegex, params[param]);
		});

		return sentence;
	}

	compareTranslationKeys(client) {
		const enKeys = Object.keys(client.languages.get('en'));

		const errors = {};

		client.languages.forEach((langData, lang) => {
			if (lang === 'en') return;

			const langKeys = Object.keys(langData);
			const keysMissingInLang = enKeys.filter(key => !langKeys.includes(key));
			const keysExtraInLang = langKeys.filter(key => !enKeys.includes(key));

			if (keysMissingInLang.length > 0 || keysExtraInLang.length > 0) {
				errors[lang] = {
					keysMissing: keysMissingInLang,
					keysExtra: keysExtraInLang,
				};
			}
		});

		if (Object.keys(errors).length === 0) {
			console.log('Aucune erreur dans les fichiers de traduction.');
		}
		else {
			console.log('Erreurs dans les fichiers de traduction :');
			for (const lang in errors) {
				console.log(`Pour la langue ${lang}:`);
				if (errors[lang].keysMissing.length > 0) {
					console.error('Clés manquantes :', errors[lang].keysMissing);
				}
				if (errors[lang].keysExtra.length > 0) {
					console.error('Clés en trop :', errors[lang].keysExtra);
				}
			}
		}
	}
}

module.exports = Translate;

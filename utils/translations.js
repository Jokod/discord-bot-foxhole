class Translate {
	constructor(client, guildID) {
		this.client = client;
		this.guildID = guildID;
	}


	translate(key, params = {}) {
		const lang = this.client.traductions.get(this.guildID);
		const sentence = this.client.languages.get(lang)[key];

		if (!sentence) {
			console.log(`[ERROR] Translation key "${key}" not found.`);
			return key;
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
}

module.exports = Translate;

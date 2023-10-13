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
}

module.exports = Translate;

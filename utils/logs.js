const fs = require('fs');
const path = require('path');

class Logs {
	constructor(interaction) {
		this.interaction = interaction;
		const { client, guild } = interaction;
		const guildId = guild.id;
		this.logFilePath = path.join(__dirname, `../var/logs/${guildId}.log`);

		const logDirectory = path.dirname(this.logFilePath);
		if (!fs.existsSync(logDirectory)) {
			fs.mkdirSync(logDirectory, { recursive: true });
		}

		if (!fs.existsSync(this.logFilePath)) {
			fs.writeFileSync(this.logFilePath, '', 'utf-8');
			client.logs.set(guildId);
		}
	}

	write() {
		const logLine = JSON.stringify({
			...this.getInfos(),
			actionType: this.interaction.type,
			message: this.getMessage(this.interaction.message),
		}) + '\n';

		fs.appendFileSync(this.logFilePath, logLine, 'utf-8');
	}

	getInfos() {
		const dateAndHourUTC = new Date().toISOString();
		const guildId = this.interaction.member.guild.id;
		const guildName = this.interaction.member.guild.name;
		const userId = this.interaction.user.id;
		const username = this.interaction.user.username;

		return { dateAndHourUTC, guildId, guildName, userId, username };
	}

	getMessage(message) {
		const type = message?.type;
		const content = message?.content;

		return { type, content };
	}

	clear() {
		fs.writeFileSync(this.logFilePath, '', 'utf-8');
	}
}

module.exports = Logs;

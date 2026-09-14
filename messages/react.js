const { isMissingAccessError } = require('../utils/discordAccess.js');

module.exports = {
	async execute(message) {
		for (const emoji of ['🟢', '🟠', '🔴']) {
			try {
				await message.react(emoji);
			}
			catch (err) {
				if (isMissingAccessError(err) || err.status === 403) {
					const code = err.code ?? err.rawError?.code ?? err.status;
					console.warn(`[React] Channel access/permissions denied on channel ${message.channelId} (code ${code})`);
					return;
				}
				throw err;
			}
		}
	},
};

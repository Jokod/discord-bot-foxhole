module.exports = {
	async execute(message) {
		for (const emoji of ['🟢', '🟠', '🔴']) {
			try {
				await message.react(emoji);
			}
			catch (err) {
				if (err.code === 50001 || err.status === 403) {
					console.warn(`[React] Accès refusé sur le canal ${message.channelId}: ${err.message}`);
					return;
				}
				throw err;
			}
		}
	},
};

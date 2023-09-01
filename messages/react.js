module.exports = {
	async execute(message) {
		await message.react('🟢');
		await message.react('🟠');
		await message.react('🔴');
	},
};

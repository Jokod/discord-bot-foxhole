const { SlashCommandBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');

const GITHUB_URL = process.env.GITHUB_URL || '';
const DISCORD_INVITE_URL = process.env.DISCORD_INVITE_URL || '';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('about')
		.setNameLocalizations({
			fr: 'a-propos',
			ru: 'о-боте',
			'zh-CN': '关于',
		})
		.setDescription('Bot links: GitHub repository and support Discord (ephemeral).')
		.setDescriptionLocalizations({
			fr: 'Liens du bot : dépôt GitHub et Discord de support (éphémère).',
			ru: 'Ссылки бота: репозиторий GitHub и Discord поддержки (временно).',
			'zh-CN': '机器人链接：GitHub 仓库与支持 Discord（仅你可见）。',
		}),

	async execute(interaction) {
		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);

		const parts = [];
		if (GITHUB_URL) {
			parts.push(translations.translate('ABOUT_GITHUB', { url: GITHUB_URL }));
		}
		if (DISCORD_INVITE_URL) {
			parts.push(translations.translate('ABOUT_DISCORD', { url: DISCORD_INVITE_URL }));
		}

		if (!parts.length) {
			await interaction.reply({
				content: translations.translate('ABOUT_NOT_CONFIGURED'),
				flags: 64,
			});
			return;
		}

		parts.push('', translations.translate('ABOUT_MESSAGE'));

		await interaction.reply({
			content: parts.join('\n'),
			flags: 64,
		});
	},
};

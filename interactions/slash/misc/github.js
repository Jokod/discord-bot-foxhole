const { SlashCommandBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');

const GITHUB_URL = process.env.GITHUB_URL || '';

module.exports = {
	data: new SlashCommandBuilder()
		.setName('github')
		.setNameLocalizations({
			fr: 'github',
			ru: 'гитхаб',
			'zh-CN': 'github',
		})
		.setDescription('Get the bot GitHub repository link (ephemeral).')
		.setDescriptionLocalizations({
			fr: 'Obtenir le lien du dépôt GitHub du bot (éphémère).',
			ru: 'Получить ссылку на репозиторий GitHub бота (временно).',
			'zh-CN': '获取机器人的 GitHub 仓库链接（仅你可见）。',
		}),

	async execute(interaction) {
		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);

		const content = GITHUB_URL
			? `${translations.translate('GITHUB_REPLY', { url: GITHUB_URL })}\n\n${translations.translate('GITHUB_MESSAGE')}`
			: translations.translate('GITHUB_NOT_CONFIGURED');

		await interaction.reply({
			content,
			flags: 64,
		});
	},
};

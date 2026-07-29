const { SlashCommandBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');

const GITHUB_URL = (process.env.GITHUB_URL || '').replace(/\/$/, '');
const DISCORD_INVITE_URL = process.env.DISCORD_INVITE_URL || '';
const GITHUB_ISSUES_URL = process.env.GITHUB_ISSUES_URL
	|| (GITHUB_URL ? `${GITHUB_URL}/issues/new` : '');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('about')
		.setNameLocalizations({
			fr: 'a-propos',
			ru: 'о-боте',
			'zh-CN': '关于',
		})
		.setDescription('Bot links: GitHub, issues, and support Discord (ephemeral).')
		.setDescriptionLocalizations({
			fr: 'Liens du bot : GitHub, déclarer une issue, Discord de support (éphémère).',
			ru: 'Ссылки бота: GitHub, создать issue и Discord поддержки (временно).',
			'zh-CN': '机器人链接：GitHub、提交 Issue、支持 Discord（仅你可见）。',
		}),

	async execute(interaction) {
		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);

		const parts = [];
		if (GITHUB_URL) {
			parts.push(translations.translate('ABOUT_GITHUB', { url: GITHUB_URL }));
		}
		if (GITHUB_ISSUES_URL) {
			parts.push(translations.translate('ABOUT_ISSUES', { url: GITHUB_ISSUES_URL }));
		}
		if (DISCORD_INVITE_URL) {
			parts.push(translations.translate('ABOUT_DISCORD', { url: DISCORD_INVITE_URL }));
			parts.push(translations.translate('ABOUT_ANNOUNCEMENTS_FOLLOW'));
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

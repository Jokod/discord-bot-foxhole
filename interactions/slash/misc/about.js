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
		.setDescription('Support Discord, Follow Announcements, GitHub & issues (ephemeral).')
		.setDescriptionLocalizations({
			fr: 'Discord de support, suivre Annonces, GitHub et issues (éphémère).',
			ru: 'Discord поддержки, отслеживание Announcements, GitHub и issues (временно).',
			'zh-CN': '支持 Discord、关注公告、GitHub 与 Issue（仅你可见）。',
		}),

	async execute(interaction) {
		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);

		const parts = [];
		if (DISCORD_INVITE_URL) {
			parts.push(translations.translate('ABOUT_DISCORD', { url: DISCORD_INVITE_URL }));
			parts.push('', translations.translate('ABOUT_ANNOUNCEMENTS_FOLLOW'));
		}
		if (GITHUB_URL) {
			parts.push('', translations.translate('ABOUT_GITHUB', { url: GITHUB_URL }));
		}
		if (GITHUB_ISSUES_URL) {
			parts.push(translations.translate('ABOUT_ISSUES', { url: GITHUB_ISSUES_URL }));
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

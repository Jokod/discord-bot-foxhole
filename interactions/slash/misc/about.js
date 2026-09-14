const { SlashCommandBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { v2Text, buildV2Payload, joinBlocks } = require('../../../utils/componentsV2.js');

const GITHUB_URL = (process.env.GITHUB_URL || '').replace(/\/$/, '');
const DISCORD_INVITE_URL = process.env.DISCORD_INVITE_URL || '';
const GITHUB_ISSUES_URL = process.env.GITHUB_ISSUES_URL
	|| (GITHUB_URL ? `${GITHUB_URL}/issues/new` : '');

const ABOUT_ACCENT = 0xE67E22;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('about')
		.setNameLocalizations({
			'es-ES': 'acerca-de',
			fr: 'a-propos',
			ru: 'о-боте',
			'zh-CN': '关于',
		})
		.setDescription('Support Discord, Follow Announcements, GitHub & issues (ephemeral).')
		.setDescriptionLocalizations({
			'es-ES': 'Discord de soporte, seguir Anuncios, GitHub e issues (efímero).',
			fr: 'Discord de support, suivre Annonces, GitHub et issues (éphémère).',
			ru: 'Discord поддержки, отслеживание Announcements, GitHub и issues (временно).',
			'zh-CN': '支持 Discord、关注公告、GitHub 与 Issue（仅你可见）。',
		}),

	async execute(interaction) {
		const guildId = interaction.guild?.id;
		const translations = new Translate(interaction.client, guildId);

		/** @type {Array<string|null>} */
		const zones = ['### FoxBot'];
		let hasLinks = false;

		if (DISCORD_INVITE_URL) {
			hasLinks = true;
			zones.push([
				translations.translate('ABOUT_DISCORD', { url: DISCORD_INVITE_URL }),
				translations.translate('ABOUT_ANNOUNCEMENTS_FOLLOW'),
			].join('\n\n'));
		}
		if (GITHUB_URL || GITHUB_ISSUES_URL) {
			hasLinks = true;
			const gh = [];
			if (GITHUB_URL) {
				gh.push(translations.translate('ABOUT_GITHUB', { url: GITHUB_URL }));
				gh.push(translations.translate('ABOUT_ISSUES', { url: GITHUB_ISSUES_URL }));
			}
			else {
				gh.push(translations.translate('ABOUT_ISSUES', { url: GITHUB_ISSUES_URL }));
			}
			zones.push(gh.join('\n'));
		}

		if (!hasLinks) {
			await interaction.reply(v2Text(translations.translate('ABOUT_NOT_CONFIGURED'), { ephemeral: true }));
			return;
		}

		zones.push(translations.translate('ABOUT_MESSAGE'));

		await interaction.reply(buildV2Payload({
			children: joinBlocks(zones, { break: 'large' }),
			ephemeral: true,
			accentColor: ABOUT_ACCENT,
		}));
	},
};

const { SlashCommandBuilder } = require('discord.js');
const Translate = require('../../../utils/translations.js');
const { safeEscapeMarkdown } = require('../../../utils/markdown.js');
const { isValidOperationTitle } = require('../../../utils/operation-text.js');
const { v2Text } = require('../../../utils/componentsV2.js');
const { buildLabeledModal, TextInputStyle } = require('../../../utils/modalLabels.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('operation')
		.setNameLocalizations({
			'es-ES': 'operacion',
			fr: 'operation',
			ru: 'операция',
			'zh-CN': '操作',
		})
		.setDescription('Create a new operation')
		.setDescriptionLocalizations({
			'es-ES': 'Crear una nueva operación',
			fr: 'Créer une nouvelle opération',
			ru: 'Создать новую операцию',
			'zh-CN': '创建新操作',
		})
		.addStringOption((option) =>
			option
				.setName('title')
				.setNameLocalizations({
					'es-ES': 'titulo',
					fr: 'titre',
					ru: 'заглавие',
					'zh-CN': '标题',
				})
				.setDescription('Title of the operation')
				.setDescriptionLocalizations({
					'es-ES': 'Título de la operación',
					fr: 'Titre de l\'opération',
					ru: 'Заглавие операции',
					'zh-CN': '操作的标题',
				})
				.setMinLength(1)
				.setMaxLength(10)
				.setRequired(true),
		)
		.setDMPermission(false),

	async execute(interaction) {
		const title = interaction.options.getString('title').toUpperCase();
		const translations = new Translate(interaction.client, interaction.guild.id);

		if (!isValidOperationTitle(title)) {
			await interaction.reply(v2Text(translations.translate('OPERATION_TITLE_FORMAT_ERROR'), { ephemeral: true }));
			return;
		}

		interaction.client.sessions[`${interaction.guild.id}:${interaction.user.id}`] = { title: title };

		const modal = buildLabeledModal({
			customId: 'modal_create_operation',
			title: translations.translate('OPERATION_CREATE_TITLE', { title: safeEscapeMarkdown(title) }),
			fields: [
				{
					customId: 'date',
					label: translations.translate('OPERATION_CREATE_LABEL_DATE'),
					description: translations.translate('OPERATION_CREATE_DESC_DATE'),
					placeholder: translations.translate('OPERATION_CREATE_PLACEHOLDER_DATE'),
					style: TextInputStyle.Short,
					minLength: 10,
					maxLength: 10,
					required: true,
				},
				{
					customId: 'time',
					label: translations.translate('OPERATION_CREATE_LABEL_TIME'),
					description: translations.translate('OPERATION_CREATE_DESC_TIME'),
					placeholder: translations.translate('OPERATION_CREATE_PLACEHOLDER_TIME'),
					style: TextInputStyle.Short,
					minLength: 5,
					maxLength: 5,
					required: true,
				},
				{
					customId: 'duration',
					label: translations.translate('OPERATION_CREATE_LABEL_DURATION'),
					description: translations.translate('OPERATION_CREATE_DESC_DURATION'),
					placeholder: '60',
					style: TextInputStyle.Short,
					value: '60',
					minLength: 1,
					maxLength: 3,
					required: true,
				},
				{
					customId: 'description',
					label: translations.translate('OPERATION_CREATE_LABEL_DESCRIPTION'),
					description: translations.translate('OPERATION_CREATE_DESC_DESCRIPTION'),
					placeholder: translations.translate('OPERATION_CREATE_DESC_DESCRIPTION'),
					style: TextInputStyle.Paragraph,
					minLength: 1,
					maxLength: 1000,
					required: true,
				},
			],
		});

		await interaction.showModal(modal);
	},
};

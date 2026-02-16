const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Group, Material, Operation } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { getRandomColor } = require('../../../utils/colors.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('logistics')
		.setNameLocalizations({
			fr: 'logistique',
			ru: 'логистика',
			'zh-CN': '后勤',
		})
		.setDescription('Commands for logistics')
		.setDescriptionLocalizations({
			fr: 'Commandes pour gérer la configuration du serveur.',
			ru: 'Команды для настройки сервера.',
			'zh-CN': '管理服务器配置的命令。',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('help')
				.setNameLocalizations({
					fr: 'aide',
					ru: 'помощь',
					'zh-CN': '帮助',
				})
				.setDescription('Displays the list of commands.')
				.setDescriptionLocalizations({
					fr: 'Affiche la liste des commandes.',
					ru: 'Отображает список команд.',
					'zh-CN': '显示命令列表。',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('resume')
				.setNameLocalizations({
					fr: 'résumé',
					ru: 'резюме',
					'zh-CN': '简历',
				})
				.setDescription('Displays resume of the logistics.')
				.setDescriptionLocalizations({
					fr: 'Affiche un résumé de la logistique.',
					ru: 'Отображает резюме логистики.',
					'zh-CN': '显示后勤简历。',
				})
				.addStringOption((option) =>
					option
						.setName('operation')
						.setNameLocalizations({
							fr: 'opération',
							ru: 'операция',
							'zh-CN': '操作',
						})
						.setDescription('The id of the operation.')
						.setDescriptionLocalizations({
							fr: 'L\'id de l\'opération.',
							ru: 'Идентификатор операции.',
							'zh-CN': '操作的ID。',
						})
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('list')
				.setNameLocalizations({
					fr: 'liste',
					ru: 'список',
					'zh-CN': '名单',
				})
				.setDescription('Displays the list of materials.')
				.setDescriptionLocalizations({
					fr: 'Affiche la liste des matériaux.',
					ru: 'Отображает список материалов.',
					'zh-CN': '显示材料清单。',
				})
				.addStringOption((option) =>
					option
						.setName('group')
						.setNameLocalizations({
							fr: 'groupe',
							ru: 'группа',
							'zh-CN': '组',
						})
						.setDescription('The id of the group.')
						.setDescriptionLocalizations({
							fr: 'L\'id du groupe.',
							ru: 'Идентификатор группы.',
							'zh-CN': '组的ID。',
						})
						.setRequired(true),
				),
		),
	async execute(interaction) {
		const { client, guild, options } = interaction;
		const inputOperationId = options.getString('operation');
		const inputListId = options.getString('group');
		const translations = new Translate(client, guild.id);

		if (inputOperationId) {
			const operation = await Operation.findOne({ guild_id: guild.id, operation_id: inputOperationId });

			if (!operation) {
				return await interaction.reply({
					content: translations.translate('OPERATION_NOT_EXIST'),
					flags: 64,
				});
			}

			const groups = await Group.find({ guild_id: guild.id, operation_id: inputOperationId });

			if (!groups.length) {
				return await interaction.reply({
					content: translations.translate('OPERATION_NOT_HAVE_GROUPS'),
					flags: 64,
				});
			}

			const promises = groups.map(async (group) => {
				const materials = await Material.find({ guild_id: guild.id, group_id: group.threadId });

				const numberTotal = materials.length;
				const numberValidated = materials.filter(material => material.status === 'validated').length;
				const numberInvalidated = numberTotal - numberValidated;

				return `**${translations.translate('MATERIAL_NOMBER')}:** ${numberTotal}\n**${translations.translate('MATERIAL_VALIDATE')}:** ${numberValidated}\n**${translations.translate('MATERIAL_INVALIDATE')}:** ${numberInvalidated}`;
			});

			const content = await Promise.all(promises);

			const embed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(translations.translate('GROUPS_OF_OPERATION', { title: operation.title }))
				.setDescription(content.join('\n\n'));

			await interaction.reply({
				embeds: [embed],
				flags: 64,
			});
		}

		else if (inputListId) {
			const group = await Group.findOne({ guild_id: guild.id, threadId: inputListId });

			if (!group) {
				return await interaction.reply({
					content: translations.translate('GROUP_NOT_EXIST'),
					flags: 64,
				});
			}

			const materials = await Material.find({ guild_id: guild.id, group_id: inputListId });

			if (!materials.length) {
				return await interaction.reply({
					content: translations.translate('GROUP_NO_MATERIALS'),
					flags: 64,
				});
			}

			const content = materials.map(material => {
				const name = material.name || translations.translate('NONE');
				const owner = material.person_id ? `<@${material.person_id}>` : translations.translate('NONE');

				return `**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${name}\n**${translations.translate('MATERIAL_QUANTITY_ASK')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${owner}\n**${translations.translate('STATUS')}:** ${translations.translate((material.status).toUpperCase())}`;
			});

			const embed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(`${translations.translate('MATERIAL_LIST_OF_GROUP')} #${inputListId}`)
				.setDescription(content.join('\n\n'));

			await interaction.reply({
				embeds: [embed],
				flags: 64,
			});
		}

		else {
			const helpEmbed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(translations.translate('LOGISTIC_LIST_COMMANDS'))
				.setDescription(
					'`' +
						client.slashCommands
							.filter(command => command.data.name === 'logistics')
							.map((command) => command.data.options.map(option => option.name))
							.join('`, `') +
						'`',
				);

			await interaction.reply({
				embeds: [helpEmbed],
				flags: 64,
			});
		}
	},
};

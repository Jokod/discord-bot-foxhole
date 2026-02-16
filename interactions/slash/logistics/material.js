const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Group, Material, Stats } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { getRandomColor } = require('../../../utils/colors.js');
const { getPriorityTranslationKey, getPriorityColoredText, getPriorityEmbedColor, DEFAULT_PRIORITY } = require('../../../utils/material-priority.js');
const { parseMaterialId } = require('../../../utils/discord.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('material')
		.setNameLocalizations({
			fr: 'matériel',
			ru: 'материал',
			'zh-CN': '材料',
		})
		.setDescription('Commands for material')
		.setDescriptionLocalizations({
			fr: 'Commandes pour gérer le matériel.',
			ru: 'Команды для управления материалом.',
			'zh-CN': '管理材料的命令。',
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
				.setName('create')
				.setNameLocalizations({
					fr: 'créer',
					ru: 'создать',
					'zh-CN': '创建',
				})
				.setDescription('Create a material.')
				.setDescriptionLocalizations({
					fr: 'Créer un matériel.',
					ru: 'Создать материал.',
					'zh-CN': '创建材料。',
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
						.setRequired(false),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('delete')
				.setNameLocalizations({
					fr: 'supprimer',
					ru: 'удалить',
					'zh-CN': '删除',
				})
				.setDescription('Delete a material.')
				.setDescriptionLocalizations({
					fr: 'Supprimer un matériel.',
					ru: 'Удалить материал.',
					'zh-CN': '删除材料。',
				})
				.addStringOption((option) =>
					option
						.setName('material')
						.setNameLocalizations({
							fr: 'matériel',
							ru: 'материал',
							'zh-CN': '材料',
						})
						.setDescription('Message ID or link to the material message.')
						.setDescriptionLocalizations({
							fr: 'ID du message ou lien vers le message du matériel.',
							ru: 'ID сообщения или ссылка на сообщение материала.',
							'zh-CN': '消息ID或材料消息的链接。',
						})
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('info')
				.setNameLocalizations({
					fr: 'info',
					ru: 'инфо',
					'zh-CN': '信息',
				})
				.setDescription('Displays the details of a material.')
				.setDescriptionLocalizations({
					fr: 'Affiche les détails d\'un matériel.',
					ru: 'Отображает подробности материала.',
					'zh-CN': '显示材料的详细信息。',
				})
				.addStringOption((option) =>
					option
						.setName('material')
						.setNameLocalizations({
							fr: 'matériel',
							ru: 'материал',
							'zh-CN': '材料',
						})
						.setDescription('Message ID or link to the material message.')
						.setDescriptionLocalizations({
							fr: 'ID du message ou lien vers le message du matériel.',
							ru: 'ID сообщения или ссылка на сообщение материала.',
							'zh-CN': '消息ID或材料消息的链接。',
						})
						.setRequired(true),
				),
		),
	async execute(interaction) {
		const { client, guild, options } = interaction;
		const inputGroupId = options.getString('group') || null;
		const rawMaterialId = options.getString('material') || null;
		const inputMaterialId = rawMaterialId ? parseMaterialId(rawMaterialId) : null;
		const translations = new Translate(client, guild.id);

		if (inputGroupId) {
			const group = await Group.findOne({ guild_id: guild.id, threadId: `${inputGroupId}` });

			if (!group) {
				return await interaction.reply({
					content: translations.translate('GROUP_NOT_EXIST'),
					flags: 64,
				});
			}
		}

		if (inputMaterialId) {
			const material = await Material.findOne({ guild_id: guild.id, material_id: `${inputMaterialId}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
				});
			}
		}

		switch (interaction.options.getSubcommand()) {
		case 'help':
			const helpEmbed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(translations.translate('LOGISTIC_LIST_COMMANDS'))
				.setDescription(
					'`' +
							interaction.client.slashCommands
								.filter(command => command.data.name === 'material')
								.map((command) => command.data.options.map(option => option.name))
								.join('`, `') +
							'`',
				);

			await interaction.reply({
				embeds: [helpEmbed],
				flags: 64,
			});
			break;
		case 'create':
			const materialButton = new ButtonBuilder()
				.setCustomId('button_logistics_add_material')
				.setLabel(translations.translate('MATERIAL'))
				.setStyle(ButtonStyle.Primary);

			const quantityAskButton = new ButtonBuilder()
				.setCustomId('button_logistics_add_quantity_ask')
				.setLabel(translations.translate('QUANTITY'))
				.setStyle(ButtonStyle.Secondary);

			const priorityButton = new ButtonBuilder()
				.setCustomId('button_logistics_add_priority')
				.setLabel(translations.translate('MATERIAL_PRIORITY'))
				.setStyle(ButtonStyle.Secondary);

			const confirmButton = new ButtonBuilder()
				.setCustomId('button_logistics_add_confirm')
				.setLabel(translations.translate('CONFIRM'))
				.setStyle(ButtonStyle.Success);

			const deleteButton = new ButtonBuilder()
				.setCustomId('button_logistics_material_delete')
				.setLabel(translations.translate('DELETE'))
				.setStyle(ButtonStyle.Danger);

			const ActionRow1 = new ActionRowBuilder().addComponents(materialButton, quantityAskButton, priorityButton);
			const ActionRow2 = new ActionRowBuilder().addComponents(confirmButton, deleteButton);

			await Material.create({
				guild_id: guild.id,
				material_id: interaction.id,
				group_id: inputGroupId,
				owner_id: interaction.user.id,
				status: 'pending',
				priority: DEFAULT_PRIORITY,
			});

			await Stats.findOneAndUpdate(
				{ guild_id: guild.id },
				{ $inc: { material_count: 1 } },
				{ upsert: true },
			);

			const response = await interaction.reply({
				content: `${translations.translate('MATERIAL_CREATOR')} <@${interaction.user.id}>`,
				components: [ActionRow1, ActionRow2],
				withResponse: true,
			});

			const message = response.resource?.message ?? await interaction.fetchReply();
			await Material.updateOne({ guild_id: guild.id, material_id: `${interaction.id}` }, { material_id: `${message.id}` });

			break;
		case 'delete': {
			const rowCount = await Material.deleteOne({ guild_id: guild.id, material_id: `${inputMaterialId}` });

			if (rowCount.deletedCount === 0) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
				});
			}

			const { channel } = interaction;
			const materialMessage = await channel.messages.fetch(inputMaterialId).catch(async () => {
				const parent = channel.parentId ? await client.channels.fetch(channel.parentId) : null;
				return parent ? parent.messages.fetch(inputMaterialId) : null;
			}).catch(() => null);
			if (materialMessage) {
				await materialMessage.delete().catch(() => undefined);
			}

			await interaction.reply({
				content: translations.translate('MATERIAL_DELETE_SUCCESS'),
				flags: 64,
			});
			break;
		}
		case 'info':
			const material = await Material.findOne({ guild_id: guild.id, material_id: `${inputMaterialId}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
				});
			}

			const name = material.name || translations.translate('NONE');
			const owner = material.person_id ? `<@${material.person_id}>` : translations.translate('NONE');
			const localization = material.localization || translations.translate('NONE');
			const priorityLabel = getPriorityColoredText(material.priority, translations.translate(getPriorityTranslationKey(material.priority)));

			const content = `**${translations.translate('MATERIAL')}:** ${name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PRIORITY')}:** ${priorityLabel}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${owner}\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${localization}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven}\n**${translations.translate('STATUS')}:** ${translations.translate((material.status).toUpperCase())}`;

			const embed = new EmbedBuilder()
				.setColor(getPriorityEmbedColor(material.priority))
				.setTitle(`${translations.translate('MATERIAL_DETAIL')} #${material.material_id}`)
				.setDescription(content);

			await interaction.reply({
				embeds: [embed],
				flags: 64,
			});
			break;
		}
	},
};

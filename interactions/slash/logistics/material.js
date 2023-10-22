const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Group, Material } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('material')
		.setNameLocalizations({
			fr: 'matériel',
		})
		.setDescription('Commands for material')
		.setDescriptionLocalizations({
			fr: 'Commandes pour gérer le matériel.',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('help')
				.setNameLocalizations({
					fr: 'aide',
				})
				.setDescription('Displays the list of commands.')
				.setDescriptionLocalizations({
					fr: 'Affiche la liste des commandes.',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('create')
				.setNameLocalizations({
					fr: 'créer',
				})
				.setDescription('Create a material.')
				.setDescriptionLocalizations({
					fr: 'Créer un matériel.',
				})
				.addStringOption((option) =>
					option
						.setName('group')
						.setNameLocalizations({
							fr: 'groupe',
						})
						.setDescription('The id of the group.')
						.setDescriptionLocalizations({
							fr: 'L\'id du groupe.',
						})
						.setRequired(false),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('delete')
				.setNameLocalizations({
					fr: 'supprimer',
				})
				.setDescription('Delete a material.')
				.setDescriptionLocalizations({
					fr: 'Supprimer un matériel.',
				})
				.addStringOption((option) =>
					option
						.setName('material')
						.setNameLocalizations({
							fr: 'matériel',
						})
						.setDescription('The id of the material.')
						.setDescriptionLocalizations({
							fr: 'L\'id du matériel.',
						})
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('info')
				.setNameLocalizations({
					fr: 'info',
				})
				.setDescription('Displays the details of a material.')
				.setDescriptionLocalizations({
					fr: 'Affiche les détails d\'un matériel.',
				})
				.addStringOption((option) =>
					option
						.setName('material')
						.setNameLocalizations({
							fr: 'matériel',
						})
						.setDescription('The id of the material.')
						.setDescriptionLocalizations({
							fr: 'L\'id du matériel.',
						})
						.setRequired(true),
				),
		),
	async execute(interaction) {
		const { client, guild, options } = interaction;
		const inputGroupId = options.getString('group') || null;
		const inputMaterialId = options.getString('material') || null;
		const translations = new Translate(client, guild.id);

		if (inputGroupId) {
			const group = await Group.findOne({ guild_id: guild.id, threadId: `${inputGroupId}` });

			if (!group) {
				return await interaction.reply({
					content: translations.translate('GROUP_NOT_EXIST'),
					ephemeral: true,
				});
			}
		}

		if (inputMaterialId) {
			const material = await Material.findOne({ guild_id: guild.id, material_id: `${inputMaterialId}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}
		}

		switch (interaction.options.getSubcommand()) {
		case 'help':
			const helpEmbed = new EmbedBuilder()
				.setColor('Random')
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
				ephemeral: true,
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

			const confirmButton = new ButtonBuilder()
				.setCustomId('button_logistics_add_confirm')
				.setLabel(translations.translate('CONFIRM'))
				.setStyle(ButtonStyle.Success);

			const deleteButton = new ButtonBuilder()
				.setCustomId('button_logistics_material_delete')
				.setLabel(translations.translate('DELETE'))
				.setStyle(ButtonStyle.Danger);

			const ActionRow = new ActionRowBuilder().addComponents(materialButton, quantityAskButton, confirmButton, deleteButton);

			await Material.create({
				guild_id: guild.id,
				material_id: interaction.id,
				group_id: inputGroupId,
				owner_id: interaction.user.id,
				status: 'pending',
			});

			const message = await interaction.reply({
				content: `${translations.translate('MATERIAL_CREATOR')} <@${interaction.user.id}>`,
				components: [ActionRow],
				fetchReply: true,
			});

			await Material.updateOne({ guild_id: guild.id, material_id: `${interaction.id}` }, { material_id: `${message.id}` });

			break;
		case 'delete':
			const rowCount = await Material.deleteOne({ guild_id: guild.id, material_id: `${inputMaterialId}` });

			if (rowCount.deletedCount === 0) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			await interaction.reply({
				content: translations.translate('MATERIAL_DELETE_SUCCESS'),
				ephemeral: true,
			});
			break;
		case 'info':
			const material = await Material.findOne({ guild_id: guild.id, material_id: `${inputMaterialId}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			const name = material.name || translations.translate('NONE');
			const owner = material.person_id ? `<@${material.person_id}>` : translations.translate('NONE');
			const localization = material.localization || translations.translate('NONE');

			const content = `**${translations.translate('MATERIAL')}:** ${name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${owner}\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${localization}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven}\n**${translations.translate('STATUS')}:** ${translations.translate((material.status).toUpperCase())}`;

			const embed = new EmbedBuilder()
				.setColor('Random')
				.setTitle(`${translations.translate('MATERIAL_DETAIL')} #${material.material_id}`)
				.setDescription(content);

			await interaction.reply({
				embeds: [embed],
				ephemeral: true,
			});
			break;
		}
	},
};

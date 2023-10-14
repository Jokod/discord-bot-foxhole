const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Group, Material, Operation } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('logistics')
		.setNameLocalizations({
			fr: 'logistique',
		})
		.setDescription('Commands for logistics')
		.setDescriptionLocalizations({
			fr: 'Commandes pour gérer la configuration du serveur.',
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
				.setName('resume')
				.setNameLocalizations({
					fr: 'résumé',
				})
				.setDescription('Displays resume of the logistics.')
				.setDescriptionLocalizations({
					fr: 'Affiche un résumé de la logistique.',
				})
				.addStringOption((option) =>
					option
						.setName('operation')
						.setNameLocalizations({
							fr: 'opération',
						})
						.setDescription('The id of the operation.')
						.setDescriptionLocalizations({
							fr: 'L\'id de l\'opération.',
						})
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('list')
				.setNameLocalizations({
					fr: 'liste',
				})
				.setDescription('Displays the list of materials.')
				.setDescriptionLocalizations({
					fr: 'Affiche la liste des matériaux.',
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
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('material')
				.setNameLocalizations({
					fr: 'matériel',
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
		const inputOperationId = interaction.options.getString('operation');
		const inputListId = interaction.options.getString('group');
		const inputMaterialId = interaction.options.getString('material');
		const translations = new Translate(interaction.client, interaction.guild.id);

		if (inputOperationId) {
			const operation = await Operation.findOne({ operation_id: inputOperationId });

			if (!operation) {
				return interaction.reply({
					content: translations.translate('OPERATION_NOT_EXIST'),
					ephemeral: true,
				});
			}

			const groups = await Group.find({ operation_id: inputOperationId });

			if (!groups.length) {
				return interaction.reply({
					content: translations.translate('OPERATION_NOT_HAVE_GROUPS'),
					ephemeral: true,
				});
			}

			const promises = groups.map(async (group) => {
				const materials = await Material.find({ group_id: group.threadId });
				const numberTotal = materials.length;
				const numberValidated = materials.filter(material => material.status === 'validated').length;
				const numberInvalidated = numberTotal - numberValidated;
				return `**${translations.translate('ID')}:** ${group.threadId}\n**${translations.translate('MATERIAL_NOMBER')}:** ${numberTotal}\n**${translations.translate('MATERIAL_VALIDATE')}:** ${numberValidated}\n**${translations.translate('MATERIAL_INVALIDATE')}:** ${numberInvalidated}`;
			});

			const content = await Promise.all(promises);

			const embed = new EmbedBuilder()
				.setColor('Random')
				.setTitle(translations.translate('GROUPS_OF_OPERATION', { title: operation.title }))
				.setDescription(content.join('\n\n'));

			await interaction.reply({
				embeds: [embed],
				ephemeral: true,
			});
		}

		else if (inputListId) {
			const group = await Group.findOne({ threadId: inputListId });

			if (!group) {
				return interaction.reply({
					content: translations.translate('GROUP_NOT_EXIST'),
					ephemeral: true,
				});
			}

			const materials = await Material.find({ group_id: inputListId });
			const content = materials.map(material => {
				const name = material.name || translations.translate('NONE');
				const owner = material.person_id ? `<@${material.person_id}>` : translations.translate('NONE');
				return `**${translations.translate('ID')}:** ${material.material_id}\n**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${name}\n**${translations.translate('MATERIAL_QUANTITY_ASK')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${owner}\n**${translations.translate('STATUS')}:** ${translations.translate((material.status).toUpperCase())}`;
			});

			const embed = new EmbedBuilder()
				.setColor('Random')
				.setTitle(`${translations.translate('MATERIAL_LIST_OF_GROUP')} #${inputListId}`)
				.setDescription(content.join('\n\n'));

			await interaction.reply({
				embeds: [embed],
				ephemeral: true,
			});
		}

		else if (inputMaterialId) {
			const material = await Material.findOne({ material_id: inputMaterialId });

			if (!material) {
				return interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			const name = material.name || translations.translate('NONE');
			const owner = material.person_id ? `<@${material.person_id}>` : translations.translate('NONE');
			const localization = material.localization || translations.translate('NONE');

			const content = `**${translations.translate('MATERIAL_CREATOR')}:** <@${material.owner_id}>\n**${translations.translate('MATERIAL')}:** ${name}\n**${translations.translate('QUANTITY')}:** ${material.quantityAsk}\n**${translations.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${owner}\n\n**${translations.translate('MATERIAL_LOCALIZATION')}:** ${localization}\n**${translations.translate('MATERIAL_QUANTITY_GIVEN')}:** ${material.quantityGiven}\n**${translations.translate('STATUS')}:** ${translations.translate((material.status).toUpperCase())}`;

			const embed = new EmbedBuilder()
				.setColor('Random')
				.setTitle(`${translations.translate('MATERIAL_DETAIL')} #${material.material_id}`)
				.setDescription(content);

			await interaction.reply({
				embeds: [embed],
				ephemeral: true,
			});
		}

		else {
			const helpEmbed = new EmbedBuilder()
				.setColor('Random')
				.setTitle(translations.translate('LOGISTIC_LIST_COMMANDS'))
				.setDescription(
					'`' +
						interaction.client.slashCommands
							.filter(command => command.data.name === 'logistics')
							.map((command) => command.data.options.map(option => option.name))
							.join('`, `') +
						'`',
				);

			await interaction.reply({
				embeds: [helpEmbed],
				ephemeral: true,
			});
		}
	},
};

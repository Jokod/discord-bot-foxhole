const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Group, Material, Operation } = require('../../../data/models.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('logistics')
		.setDescription('Commands for logistics')
		.setDescriptionLocalizations({
			fr: 'Commandes pour gérer la configuration du serveur.',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('help')
				.setDescription('Displays the list of commands.')
				.setDescriptionLocalizations({
					fr: 'Affiche la liste des commandes.',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('resume')
				.setDescription('Displays resume of the logistics.')
				.setDescriptionLocalizations({
					fr: 'Affiche un résumé de la logistique.',
				})
				.addStringOption((option) =>
					option
						.setName('operation')
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
				.setDescription('Displays the list of materials.')
				.setDescriptionLocalizations({
					fr: 'Affiche la liste des matériaux.',
				})
				.addStringOption((option) =>
					option
						.setName('group')
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
				.setDescription('Displays the details of a material.')
				.setDescriptionLocalizations({
					fr: 'Affiche les détails d\'un matériel.',
				})
				.addStringOption((option) =>
					option
						.setName('material')
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

		if (inputOperationId) {
			const operation = await Operation.findOne({ operation_id: inputOperationId });

			if (!operation) {
				return interaction.reply({
					content: 'The operation doesn\'t exist !',
					ephemeral: true,
				});
			}

			const groups = await Group.find({ operation_id: inputOperationId });
			const promises = groups.map(async (group) => {
				const materials = await Material.find({ group_id: group.threadId });
				const numberTotal = materials.length;
				const numberValidated = materials.filter(material => material.status === 'validated').length;
				const numberInvalidated = numberTotal - numberValidated;
				return `**ID:** ${group.threadId}\n**Nombre de matériaux:** ${numberTotal}\n**Matériaux validés:** ${numberValidated}\n**Matériaux invalidés:** ${numberInvalidated}`;
			});

			const content = await Promise.all(promises);

			const embed = new EmbedBuilder()
				.setColor('Random')
				.setTitle(`Groups of the operation #${operation.title}`)
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
					content: 'The group doesn\'t exist !',
					ephemeral: true,
				});
			}

			const materials = await Material.find({ group_id: inputListId });
			const content = materials.map(material => {
				const name = material.name || 'Aucun';
				const owner = material.owner_id ? `<@${material.owner_id}>` : 'Aucun';
				return `**ID:** ${material.material_id}\n**Matériel:** ${name}\n**Quantité Demandée:** ${material.quantityAsk}\n**Quantité soumise:** ${material.quantityGiven}\n**Responsable:** ${owner}`;
			});

			const embed = new EmbedBuilder()
				.setColor('Random')
				.setTitle(`List of materials of the group #${inputListId}`)
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
					content: 'The material doesn\'t exist !',
					ephemeral: true,
				});
			}

			const name = material.name || 'Aucun';
			const owner = material.owner_id ? `<@${material.owner_id}>` : 'Aucun';
			const localization = material.localization || 'Aucun';

			const content = `**Matériel:** ${name}\n**Quantité:** ${material.quantityAsk}**\nResponsable:** ${owner}\n\n**Lieu de stockage:** ${localization}\n**Quantité donnée:** ${material.quantityGiven}`;

			const embed = new EmbedBuilder()
				.setColor('Random')
				.setTitle(`Details of the material #${material.material_id}`)
				.setDescription(content);

			await interaction.reply({
				embeds: [embed],
				ephemeral: true,
			});
		}

		else {
			const helpEmbed = new EmbedBuilder()
				.setColor('Random')
				.setTitle('List of commands for logistics')
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

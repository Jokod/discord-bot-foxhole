const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { Material } = require('../../../../../data/models.js');
const { categories } = require('../../../../../data/fournis.js');
const Translate = require('../../../../../utils/translations.js');

module.exports = {
	id: 'button_logistics_add_material',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

		// Créer les boutons pour les grandes catégories
		const categoryButtons = [];
		
		Object.keys(categories).forEach(categoryKey => {
			const category = categories[categoryKey];
			const translationKey = `CATEGORY_${categoryKey.toUpperCase()}`;
			
			const button = new ButtonBuilder()
				.setCustomId(`logistics_select_category-${categoryKey}`)
				.setLabel(translations.translate(translationKey))
				.setEmoji(category.icon)
				.setStyle(ButtonStyle.Primary);
			
			categoryButtons.push(button);
		});

		const buttonBack = new ButtonBuilder()
			.setCustomId('logistics_select_material_back')
			.setLabel(translations.translate('BACK'))
			.setStyle(ButtonStyle.Secondary);

		// Organiser les boutons en lignes (max 5 boutons par ligne)
		const rows = [];
		for (let i = 0; i < categoryButtons.length; i += 5) {
			const rowButtons = categoryButtons.slice(i, i + 5);
			rows.push(new ActionRowBuilder().addComponents(...rowButtons));
		}
		
		// Ajouter le bouton de retour
		rows.push(new ActionRowBuilder().addComponents(buttonBack));

		try {
			const material = await Material.findOne({ guild_id: guild.id, material_id: `${message.id}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
				});
			}

			if (interaction.user.id !== material.owner_id) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_ARE_NO_CREATOR_ERROR'),
					flags: 64,
				});
			}

			await interaction.update({
				content: `${translations.translate('MATERIAL_SELECT_TYPE')}`,
				components: rows,
			});
		}
		catch (error) {
			console.error(error);
			await interaction.reply({
				content: translations.translate('MATERIAL_CREATE_ERROR'),
				flags: 64,
			});
		}
	},
};

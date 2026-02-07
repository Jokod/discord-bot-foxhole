const ResponseMaterial = require('../../../../utils/interaction/response_material.js');
const { Material } = require('../../../../data/models.js');
const Translate = require('../../../../utils/translations.js');

/**
 * Handler pour le bouton retour depuis la sélection de catégories
 * Retourne à l'écran principal du matériel
 */
module.exports = {
	id: 'logistics_select_material_back',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

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

			await new ResponseMaterial(interaction, material).response();
		}
		catch (error) {
			console.error(error);
			return await interaction.reply({
				content: translations.translate('MATERIAL_BACK_ERROR'),
				flags: 64,
			});
		}
	},
};

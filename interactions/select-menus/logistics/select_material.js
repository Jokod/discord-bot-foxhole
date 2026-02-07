const { Material } = require('../../../data/models.js');
const ResponseMaterial = require('../../../utils/interaction/response_material.js');
const Translate = require('../../../utils/translations.js');

module.exports = {
	id: 'select_logistics_add_material',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const value = interaction.values[0];
		const translations = new Translate(client, guild.id);

		try {
			let material = await Material.findOne({ guild_id: guild.id, material_id: `${message.id}` });

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

			await Material.updateOne({ guild_id: guild.id, material_id: `${message.id}` }, { name: value });

			material = await Material.findOne({ guild_id: guild.id, material_id: `${message.id}` });

			await new ResponseMaterial(interaction, material).response();
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_UPDATE_ERROR'),
				flags: 64,
			});
		}
	},
};

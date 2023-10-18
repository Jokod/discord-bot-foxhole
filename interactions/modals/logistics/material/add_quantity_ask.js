const { Material } = require('../../../../data/models.js');
const ResponseMaterial = require('../../../../utils/interaction/response_material.js');
const Translate = require('../../../../utils/translations.js');

module.exports = {
	id: 'modal_logistics_add_quantity_ask',

	async execute(interaction) {
		const { client, guild, message } = interaction;
		const translations = new Translate(client, guild.id);

		const quantity_ask = interaction.fields.getTextInputValue('quantity_ask');

		if (isNaN(quantity_ask) || quantity_ask < 0) {
			return await interaction.reply({
				content: translations.translate('MATERIAL_QUANTITY_ERROR'),
				ephemeral: true,
			});
		}

		try {
			await Material.updateOne({ material_id: `${message.id}` }, { quantityAsk: quantity_ask });

			const material = await Material.findOne({ material_id: `${message.id}` });

			await new ResponseMaterial(interaction, material).response();
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_SELECT_ERROR'),
				ephemeral: true,
			});
		}
	},
};

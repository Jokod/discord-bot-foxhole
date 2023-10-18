const { Material } = require('../../../../data/models.js');
const Translate = require('../../../../utils/translations.js');

module.exports = {
	id: 'modal_logistics_remove',

	async execute(interaction) {
		const { client, guild, channel } = interaction;
		const translations = new Translate(client, guild.id);

		const materialId = interaction.fields.getTextInputValue('material_id');

		try {
			const material = await Material.findOne({ material_id: `${materialId}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					ephemeral: true,
				});
			}

			const message = await channel.messages.fetch(material.material_id)
				.catch(async () => {
					const parentChannel = await client.channels.fetch(channel.parentId);
					return await parentChannel.messages.fetch(material.material_id);
				});

			if (message) {
				await message.delete();
			}

			await Material.deleteOne({ material_id: material.material_id });

			await interaction.reply({
				content: translations.translate('MATERIAL_DELETE_SUCCESS'),
				ephemeral: true,
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_DELETE_ERROR'),
				ephemeral: true,
			});
		}
	},
};

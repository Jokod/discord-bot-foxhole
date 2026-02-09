const { Material } = require('../../../../data/models.js');
const Translate = require('../../../../utils/translations.js');

module.exports = {
	id: 'modal_logistics_remove',

	async execute(interaction) {
		const { client, guild, channel, fields } = interaction;
		const translations = new Translate(client, guild.id);

		const materialId = fields.getTextInputValue('material_id');

		try {
			const material = await Material.findOne({ guild_id: guild.id, material_id: `${materialId}` });

			if (!material) {
				return await interaction.reply({
					content: translations.translate('MATERIAL_NOT_EXIST'),
					flags: 64,
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

			await Material.deleteOne({ guild_id: guild.id, material_id: material.material_id });

			await interaction.reply({
				content: translations.translate('MATERIAL_DELETE_SUCCESS'),
				flags: 64,
			});
		}
		catch (err) {
			console.error(err);
			return await interaction.reply({
				content: translations.translate('MATERIAL_DELETE_ERROR'),
				flags: 64,
			});
		}
	},
};

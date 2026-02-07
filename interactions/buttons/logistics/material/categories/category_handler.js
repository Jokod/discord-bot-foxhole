const { routeMaterialInteraction } = require('../dynamic_material_handler');

/**
 * Handler dynamique pour toutes les interactions de catégories
 * Gère les IDs au format: logistics_select_category-{categoryKey}
 */
module.exports = {
	init: true,
	id: 'logistics_select_category',

	async execute(interaction) {
		await routeMaterialInteraction(interaction);
	},
};

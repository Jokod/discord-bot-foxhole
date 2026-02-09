const { routeMaterialInteraction } = require('../dynamic_material_handler');

/**
 * Handler dynamique pour toutes les interactions de sous-catégories
 * Gère les IDs au format: logistics_select_subcategory-{categoryKey}-{subcategoryKey}
 */
module.exports = {
	init: true,
	id: 'logistics_select_subcategory',

	async execute(interaction) {
		await routeMaterialInteraction(interaction);
	},
};

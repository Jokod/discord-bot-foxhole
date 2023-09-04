const ManageMaterial = require('./manage_material.js');

class ResponseMaterial {
	constructor(interaction, material) {
		this.interaction = interaction;
		this.material = material;
		this.manageMaterialInstance = new ManageMaterial(interaction).actionRow();
	}

	async response() {
		let name = 'Aucun';
		if (this.material.name) {
			name = this.material.name.charAt(0).toUpperCase() + this.material.name.slice(1);
		}

		await this.interaction.update({
			content: `**ID:** ${this.material.material_id}\n**Matériel:** ${name}\n**Quantité:** ${this.material.quantityAsk}**\nResponsable:** Aucun`,
			components: [this.manageMaterialInstance],
		});
	}
}

module.exports = ResponseMaterial;

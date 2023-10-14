const ManageMaterial = require('./manage_material.js');
const Translate = require('../translations.js');

class ResponseMaterial {
	constructor(interaction, material) {
		this.interaction = interaction;
		this.material = material;
		this.manageMaterialInstance = new ManageMaterial(interaction).actionRow();
		this.translate = new Translate(this.interaction.client, this.interaction.guild.id);
	}

	async response() {
		let name = this.translate.translate('NONE');
		if (this.material.name) {
			name = this.material.name.charAt(0).toUpperCase() + this.material.name.slice(1);
		}

		await this.interaction.update({
			content: `**${this.translate.translate('ID')}:** ${this.material.material_id}\n**${this.translate.translate('MATERIAL_CREATOR')}:** <@${this.material.owner_id}>\n**${this.translate.translate('MATERIAL')}:** ${name}\n**${this.translate.translate('QUANTITY')}:** ${this.material.quantityAsk}\n**${this.translate.translate('MATERIAL_PERSON_IN_CHARGE')}:** ${this.translate.translate('NONE')}`,
			components: [this.manageMaterialInstance],
		});
	}
}

module.exports = ResponseMaterial;

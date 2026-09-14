'use strict';

const {
	ModalBuilder,
	LabelBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');

/**
 * Text Input wrapped in a Discord Label component (modal Components).
 * The label/description live on the Label — do not set label on the TextInput.
 *
 * @param {object} opts
 * @param {string} opts.customId
 * @param {string} opts.label
 * @param {string} [opts.description]
 * @param {import('discord.js').TextInputStyle} [opts.style]
 * @param {boolean} [opts.required=true]
 * @param {number} [opts.minLength]
 * @param {number} [opts.maxLength]
 * @param {string} [opts.placeholder]
 * @param {string|number} [opts.value]
 * @returns {import('discord.js').LabelBuilder}
 */
function labeledTextInput(opts) {
	const input = new TextInputBuilder()
		.setCustomId(opts.customId)
		.setStyle(opts.style ?? TextInputStyle.Short)
		.setRequired(opts.required !== false);

	if (opts.minLength != null) input.setMinLength(opts.minLength);
	if (opts.maxLength != null) input.setMaxLength(opts.maxLength);
	if (opts.placeholder) {
		input.setPlaceholder(String(opts.placeholder).slice(0, 100));
	}
	if (opts.value != null && String(opts.value) !== '') {
		input.setValue(String(opts.value).slice(0, 4000));
	}

	const label = new LabelBuilder()
		.setLabel(String(opts.label).slice(0, 45))
		.setTextInputComponent(input);

	if (opts.description) {
		label.setDescription(String(opts.description).slice(0, 100));
	}

	return label;
}

/**
 * @param {object} opts
 * @param {string} opts.customId
 * @param {string} opts.title
 * @param {Array<object>} opts.fields - labeledTextInput option objects
 * @returns {import('discord.js').ModalBuilder}
 */
function buildLabeledModal({ customId, title, fields }) {
	const modal = new ModalBuilder()
		.setCustomId(customId)
		.setTitle(String(title).slice(0, 45));

	const labels = (fields || []).map((field) => labeledTextInput(field));
	if (labels.length) {
		modal.addLabelComponents(...labels);
	}
	return modal;
}

module.exports = {
	labeledTextInput,
	buildLabeledModal,
	TextInputStyle,
};

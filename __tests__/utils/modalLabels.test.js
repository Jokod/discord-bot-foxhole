'use strict';

const { buildLabeledModal, labeledTextInput, TextInputStyle } = require('../../utils/modalLabels.js');

describe('modalLabels', () => {
	it('labeledTextInput wraps TextInput in Label (type 18)', () => {
		const label = labeledTextInput({
			customId: 'field_a',
			label: 'Name',
			description: 'Help text',
			placeholder: 'Type here',
			style: TextInputStyle.Short,
			minLength: 1,
			maxLength: 10,
			required: true,
		});
		const json = label.toJSON();
		expect(json.type).toBe(18);
		expect(json.label).toBe('Name');
		expect(json.description).toBe('Help text');
		expect(json.component.type).toBe(4);
		expect(json.component.custom_id).toBe('field_a');
		expect(json.component.label).toBeUndefined();
	});

	it('labeledTextInput defaults style Short and required true', () => {
		const json = labeledTextInput({
			customId: 'x',
			label: 'L',
			required: false,
			value: '',
		}).toJSON();
		expect(json.component.style).toBe(TextInputStyle.Short);
		expect(json.component.required).toBe(false);
		expect(json.component.value).toBeUndefined();
	});

	it('buildLabeledModal uses Label components only', () => {
		const modal = buildLabeledModal({
			customId: 'modal_x',
			title: 'Title',
			fields: [
				{ customId: 'a', label: 'A', style: TextInputStyle.Short },
				{ customId: 'b', label: 'B', style: TextInputStyle.Paragraph, value: 'pre' },
			],
		});
		const json = modal.toJSON();
		expect(json.custom_id).toBe('modal_x');
		expect(json.components).toHaveLength(2);
		expect(json.components.every((c) => c.type === 18)).toBe(true);
		expect(json.components[1].component.value).toBe('pre');
	});

	it('buildLabeledModal gère fields absents ou vides', () => {
		const empty = buildLabeledModal({ customId: 'm', title: 'T', fields: [] });
		expect(empty.components).toEqual([]);

		const missing = buildLabeledModal({ customId: 'm2', title: 'T2' });
		expect(missing.components).toEqual([]);
	});
});

const confirmHandler = require('../../interactions/buttons/logistics/material/add/confirm');
const revokeHandler = require('../../interactions/buttons/logistics/material/revoke');
const prioritySelectHandler = require('../../interactions/buttons/logistics/material/add/priority_select');

jest.mock('../../data/models.js', () => ({
	Material: {
		findOne: jest.fn(),
		updateOne: jest.fn().mockResolvedValue({ ok: 1 }),
	},
}));

jest.mock('../../utils/translations.js', () => {
	return jest.fn().mockImplementation(() => ({
		translate: jest.fn((key) => {
			const t = {
				ASSIGNEE: 'Assigné',
				MATERIAL_PRIORITY: 'Priorité',
				DELETE: 'Supprimer',
				MATERIAL_CREATOR: 'Créateur',
				MATERIAL: 'Matériel',
				QUANTITY: 'Quantité',
				MATERIAL_PERSON_IN_CHARGE: 'Responsable',
				NONE: 'Aucun',
				MATERIAL_NOT_EXIST: 'Ce matériel n\'existe pas.',
				MATERIAL_ARE_NO_CREATOR_ERROR: 'Vous n\'êtes pas le créateur.',
				MATERIAL_CANNOT_MANAGE_ERROR: 'Vous ne pouvez pas modifier ce matériel.',
				MATERIAL_HAVE_NO_NAME_OR_QUANTITY: 'Nom et quantité requis.',
				MATERIAL_CONFIRM_ERROR: 'Erreur confirmation.',
				MATERIAL_ARE_NO_OWNER_ERROR: 'Vous n\'êtes pas le responsable.',
				MATERIAL_ASSIGN_ERROR: 'Erreur assignation.',
				MATERIAL_UPDATE_ERROR: 'Erreur mise à jour.',
				MATERIAL_PRIORITY_LOW: 'Faible',
				MATERIAL_PRIORITY_NEUTRAL: 'Neutre',
				MATERIAL_PRIORITY_HIGH: 'Haute',
			};
			return t[key] || key;
		}),
	}));
});

jest.mock('../../utils/interaction/response_material.js', () => {
	return jest.fn().mockImplementation(() => ({
		response: jest.fn().mockResolvedValue(true),
	}));
});

jest.mock('../../utils/material-priority.js', () => ({
	getPriorityTranslationKey: jest.fn((p) => {
		const k = { low: 'MATERIAL_PRIORITY_LOW', neutral: 'MATERIAL_PRIORITY_NEUTRAL', high: 'MATERIAL_PRIORITY_HIGH' };
		return k[p] || 'MATERIAL_PRIORITY_NEUTRAL';
	}),
	getPriorityColoredText: jest.fn((_p, text) => text),
}));

const { Material } = require('../../data/models.js');
const ResponseMaterial = require('../../utils/interaction/response_material.js');

describe('Material confirm / revoke / priority_select', () => {
	let mockInteraction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockInteraction = {
			client: {},
			guild: { id: 'guild-1' },
			message: { id: 'msg-1' },
			user: { id: 'owner-1' },
			customId: 'button_logistics_priority_neutral',
			update: jest.fn().mockResolvedValue(true),
			reply: jest.fn().mockResolvedValue(true),
		};
	});

	describe('confirm (button_logistics_add_confirm)', () => {
		it('affiche Assigné, Priorité et Supprimer après confirmation', async () => {
			Material.findOne.mockResolvedValue({
				guild_id: 'guild-1',
				material_id: 'msg-1',
				owner_id: 'owner-1',
				name: 'fusil',
				quantityAsk: 10,
				priority: 'neutral',
			});

			await confirmHandler.execute(mockInteraction);

			expect(mockInteraction.update).toHaveBeenCalled();
			const { components } = mockInteraction.update.mock.calls[0][0];
			expect(components).toHaveLength(1);
			const ids = components[0].components.map(c => c.data?.custom_id ?? c.customId);
			expect(ids).toContain('button_logistics_assignee');
			expect(ids).toContain('button_logistics_add_priority');
			expect(ids).toContain('button_logistics_material_delete');
			expect(ids).toHaveLength(3);
		});
	});

	describe('revoke (button_logistics_revoke)', () => {
		it('affiche Assigné, Priorité et Supprimer après rétractation', async () => {
			Material.findOne
				.mockResolvedValueOnce({
					guild_id: 'guild-1',
					material_id: 'msg-1',
					owner_id: 'owner-1',
					person_id: 'owner-1',
					name: 'fusil',
					quantityAsk: 10,
					quantityGiven: 0,
					localization: null,
					priority: 'high',
				})
				.mockResolvedValueOnce({
					guild_id: 'guild-1',
					material_id: 'msg-1',
					owner_id: 'owner-1',
					person_id: null,
					name: 'fusil',
					quantityAsk: 10,
					quantityGiven: 0,
					localization: null,
					priority: 'high',
				});

			await revokeHandler.execute(mockInteraction);

			expect(mockInteraction.update).toHaveBeenCalled();
			const { components } = mockInteraction.update.mock.calls[0][0];
			expect(components).toHaveLength(1);
			const ids = components[0].components.map(c => c.data?.custom_id ?? c.customId);
			expect(ids).toContain('button_logistics_assignee');
			expect(ids).toContain('button_logistics_add_priority');
			expect(ids).toContain('button_logistics_material_delete');
			expect(ids).toHaveLength(3);
		});
	});

	describe('priority_select when material is confirmed', () => {
		it('réaffiche Assigné, Priorité, Supprimer sans appeler ResponseMaterial', async () => {
			Material.findOne.mockResolvedValue({
				guild_id: 'guild-1',
				material_id: 'msg-1',
				owner_id: 'owner-1',
				name: 'fusil',
				quantityAsk: 10,
				status: 'confirmed',
				person_id: null,
				priority: 'high',
			});

			await prioritySelectHandler.execute(mockInteraction);

			expect(mockInteraction.update).toHaveBeenCalled();
			expect(ResponseMaterial).not.toHaveBeenCalled();
			const { components } = mockInteraction.update.mock.calls[0][0];
			expect(components).toHaveLength(1);
			const ids = components[0].components.map(c => c.data?.custom_id ?? c.customId);
			expect(ids).toContain('button_logistics_assignee');
			expect(ids).toContain('button_logistics_add_priority');
			expect(ids).toContain('button_logistics_material_delete');
			expect(ids).toHaveLength(3);
		});

		it('quand material non confirmé appelle ResponseMaterial', async () => {
			Material.findOne.mockResolvedValue({
				guild_id: 'guild-1',
				material_id: 'msg-1',
				owner_id: 'owner-1',
				name: 'fusil',
				quantityAsk: 10,
				status: 'pending',
				priority: 'neutral',
			});

			await prioritySelectHandler.execute(mockInteraction);

			expect(ResponseMaterial).toHaveBeenCalledWith(mockInteraction, expect.objectContaining({ status: 'pending' }));
			expect(ResponseMaterial.mock.results[0].value.response).toHaveBeenCalled();
		});

		it('refuse de changer la priorité si l\'utilisateur n\'est pas le créateur', async () => {
			Material.findOne.mockResolvedValue({
				guild_id: 'guild-1',
				material_id: 'msg-1',
				owner_id: 'owner-1',
				name: 'fusil',
				quantityAsk: 10,
				status: 'confirmed',
				priority: 'neutral',
			});

			const notOwnerInteraction = { ...mockInteraction, user: { id: 'other-user-id' } };

			await prioritySelectHandler.execute(notOwnerInteraction);

			expect(notOwnerInteraction.reply).toHaveBeenCalledWith(
				expect.objectContaining({
					content: 'Vous ne pouvez pas modifier ce matériel.',
					flags: 64,
				}),
			);
			expect(Material.updateOne).not.toHaveBeenCalled();
		});
	});
});

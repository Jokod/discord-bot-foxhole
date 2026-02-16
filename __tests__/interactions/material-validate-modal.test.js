const validateModal = require('../../interactions/modals/logistics/material/validate.js');

// Mock du modèle Material, Stats et des traductions
jest.mock('../../data/models.js', () => ({
	Material: {
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn(),
	},
	Stats: {
		findOneAndUpdate: jest.fn().mockResolvedValue({}),
	},
}));

jest.mock('../../utils/translations.js', () => {
	return jest.fn().mockImplementation(() => ({
		translate: jest.fn((key) => {
			const translations = {
				NONE: 'Aucun',
				MATERIAL_CREATOR: 'Créateur',
				MATERIAL: 'Matériel',
				QUANTITY: 'Quantité',
				MATERIAL_PRIORITY: 'Priorité',
				MATERIAL_PRIORITY_LOW: 'Faible',
				MATERIAL_PRIORITY_NEUTRAL: 'Neutre',
				MATERIAL_PRIORITY_HIGH: 'Haute',
				MATERIAL_PERSON_IN_CHARGE: 'Responsable',
				MATERIAL_LOCALIZATION: 'Lieu',
				MATERIAL_QUANTITY_GIVEN: 'Quantité soumise',
				MATERIAL_NOT_EXIST: 'Ce matériel n\'existe pas.',
				MATERIAL_QUANTITY_ERROR: 'Quantité invalide.',
				MATERIAL_LOCALIZATION_ERROR: 'Localisation invalide.',
				MATERIAL_VALIDATE_ERROR: 'Erreur lors de la validation.',
			};
			return translations[key] || key;
		}),
	}));
});

const { Material } = require('../../data/models.js');

describe('Modal - logistics material validate', () => {
	let mockInteraction;

	beforeEach(() => {
		jest.clearAllMocks();

		mockInteraction = {
			client: {},
			guild: { id: 'test-guild-id' },
			message: { id: 'test-message-id' },
			fields: {
				getTextInputValue: jest.fn((id) => {
					if (id === 'localization') return 'Depot A';
					if (id === 'quantity_given') return '3';
					return '';
				}),
			},
			update: jest.fn().mockResolvedValue(true),
			reply: jest.fn().mockResolvedValue(true),
		};
	});

	it('retire le responsable et remet les boutons Assignee/Delete après une validation partielle', async () => {
		// Matériel existant, non encore entièrement validé
		Material.findOne.mockResolvedValue({
			guild_id: 'test-guild-id',
			material_id: 'test-message-id',
			owner_id: 'owner-id',
			name: 'fusil',
			quantityAsk: 10,
			quantityGiven: 2,
		});

		Material.findOneAndUpdate.mockResolvedValue({
			guild_id: 'test-guild-id',
			material_id: 'test-message-id',
			owner_id: 'owner-id',
			name: 'fusil',
			quantityAsk: 10,
			quantityGiven: 5,
			status: 'confirmed',
			person_id: null,
		});

		await validateModal.execute(mockInteraction);

		// Validation partielle : person_id à null, status à 'confirmed' (reste sur écran Assigné/Priorité/Supprimer)
		expect(Material.findOneAndUpdate).toHaveBeenCalledWith(
			{ material_id: 'test-message-id' },
			expect.objectContaining({
				localization: 'Depot A',
				quantityGiven: 5,
				status: 'confirmed',
				person_id: null,
			}),
			{ new: true },
		);

		// Vérifie que le message affiche Responsable: Aucun
		expect(mockInteraction.update).toHaveBeenCalled();
		const updateCall = mockInteraction.update.mock.calls[0][0];

		expect(updateCall.content).toContain('Responsable');
		expect(updateCall.content).toContain('Aucun');

		// Boutons : Assignee + Priorité + Delete
		expect(updateCall.components).toHaveLength(1);
		const row = updateCall.components[0];
		expect(row.components).toHaveLength(3);
		const ids = row.components.map(c => c.data.custom_id || c.customId);
		expect(ids).toContain('button_logistics_assignee');
		expect(ids).toContain('button_logistics_add_priority');
		expect(ids).toContain('button_logistics_material_delete');
	});

	it('retire le responsable et n\'affiche plus que Delete lorsque la quantité est totalement validée', async () => {
		Material.findOne.mockResolvedValue({
			guild_id: 'test-guild-id',
			material_id: 'test-message-id',
			owner_id: 'owner-id',
			name: 'fusil',
			quantityAsk: 5,
			quantityGiven: 3,
		});

		Material.findOneAndUpdate.mockResolvedValue({
			guild_id: 'test-guild-id',
			material_id: 'test-message-id',
			owner_id: 'owner-id',
			name: 'fusil',
			quantityAsk: 5,
			quantityGiven: 6,
			status: 'validated',
			person_id: null,
		});

		await validateModal.execute(mockInteraction);

		// Vérifie que le statut est "validated" et que person_id est null
		expect(Material.findOneAndUpdate).toHaveBeenCalledWith(
			{ material_id: 'test-message-id' },
			expect.objectContaining({
				status: 'validated',
				person_id: null,
			}),
			{ new: true },
		);

		// Ici, on est dans la branche "entièrement validé" -> retour direct
		expect(mockInteraction.update).toHaveBeenCalled();
		const updateCall = mockInteraction.update.mock.calls[0][0];

		expect(updateCall.content).toContain('Responsable');
		expect(updateCall.content).toContain('Aucun');

		// Un seul bouton : Delete
		expect(updateCall.components).toHaveLength(1);
		const row = updateCall.components[0];
		expect(row.components).toHaveLength(1);
		const ids = row.components.map(c => c.data.custom_id || c.customId);
		expect(ids).toContain('button_logistics_material_delete');
	});
});


const removeModal = require('../../interactions/modals/logistics/material/remove.js');
const removeButton = require('../../interactions/buttons/logistics/remove.js');

jest.mock('../../data/models.js', () => ({
	Material: {
		findOne: jest.fn(),
		deleteOne: jest.fn(),
	},
}));

jest.mock('../../utils/translations.js', () => {
	return jest.fn().mockImplementation(() => ({
		translate: jest.fn((key) => {
			const t = {
				MATERIAL_ENTER_ID: 'ID du message ou lien',
				MATERIAL_NOT_EXIST: 'Ce matériel n\'existe pas.',
				MATERIAL_DELETE_SUCCESS: 'Matériel supprimé.',
				MATERIAL_DELETE_ERROR: 'Erreur lors de la suppression.',
			};
			return t[key] || key;
		}),
	}));
});

const { Material } = require('../../data/models.js');

describe('Modal - logistics material remove', () => {
	let mockInteraction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockInteraction = {
			client: { channels: { fetch: jest.fn() } },
			guild: { id: 'guild-1' },
			channel: {
				parentId: 'parent-channel-id',
				messages: {
					fetch: jest.fn().mockResolvedValue({ delete: jest.fn().mockResolvedValue(undefined) }),
				},
			},
			fields: {
				getTextInputValue: jest.fn().mockReturnValue('123456789012345678'),
			},
			reply: jest.fn().mockResolvedValue(true),
		};
	});

	it('has correct modal id', () => {
		expect(removeModal.id).toBe('modal_logistics_remove');
	});

	it('calls Material.findOne and deleteOne with submitted ID when user enters raw message ID', async () => {
		Material.findOne.mockResolvedValue({
			guild_id: 'guild-1',
			material_id: '123456789012345678',
		});
		Material.deleteOne.mockResolvedValue({ deletedCount: 1 });

		await removeModal.execute(mockInteraction);

		expect(Material.findOne).toHaveBeenCalledWith({
			guild_id: 'guild-1',
			material_id: '123456789012345678',
		});
		expect(Material.deleteOne).toHaveBeenCalledWith({
			guild_id: 'guild-1',
			material_id: '123456789012345678',
		});
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Matériel supprimé.',
			flags: 64,
		});
	});

	it('extracts message ID from Discord link and finds material', async () => {
		const discordLink = 'https://discord.com/channels/111/222/999888777666555444';
		mockInteraction.fields.getTextInputValue.mockReturnValue(discordLink);

		Material.findOne.mockResolvedValue({
			guild_id: 'guild-1',
			material_id: '999888777666555444',
		});
		Material.deleteOne.mockResolvedValue({ deletedCount: 1 });

		await removeModal.execute(mockInteraction);

		expect(Material.findOne).toHaveBeenCalledWith({
			guild_id: 'guild-1',
			material_id: '999888777666555444',
		});
		expect(Material.deleteOne).toHaveBeenCalledWith({
			guild_id: 'guild-1',
			material_id: '999888777666555444',
		});
	});

	it('replies MATERIAL_NOT_EXIST when material not found', async () => {
		Material.findOne.mockResolvedValue(null);

		await removeModal.execute(mockInteraction);

		expect(Material.deleteOne).not.toHaveBeenCalled();
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Ce matériel n\'existe pas.',
			flags: 64,
		});
	});

	it('replies MATERIAL_DELETE_ERROR on throw', async () => {
		Material.findOne.mockRejectedValue(new Error('DB error'));

		await removeModal.execute(mockInteraction);

		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Erreur lors de la suppression.',
			flags: 64,
		});
	});
});

describe('Button - logistics remove (open modal)', () => {
	it('has correct button id', () => {
		expect(removeButton.id).toBe('button_logistics_remove');
	});

	it('shows modal with MATERIAL_ENTER_ID as title and field label', async () => {
		const mockInteraction = {
			client: {},
			guild: { id: 'guild-1' },
			showModal: jest.fn().mockResolvedValue(undefined),
		};

		await removeButton.execute(mockInteraction);

		expect(mockInteraction.showModal).toHaveBeenCalledTimes(1);
		const [modal] = mockInteraction.showModal.mock.calls[0];
		const payload = typeof modal.toJSON === 'function' ? modal.toJSON() : (modal.data || modal);
		expect(payload.custom_id || payload.customId).toBe('modal_logistics_remove');
		expect(payload.title).toBe('ID du message ou lien');
		const rows = payload.components || [];
		const firstRow = rows[0];
		const field = firstRow?.components?.[0] || firstRow;
		expect(field.custom_id || field.customId).toBe('material_id');
		expect(field.label).toBe('ID du message ou lien');
	});
});

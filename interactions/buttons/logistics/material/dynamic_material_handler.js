const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Material, Server } = require('../../../../data/models.js');
const { categories, getMaterialsBySubcategory } = require('../../../../data/fournis.js');
const Translate = require('../../../../utils/translations.js');

/**
 * Constantes pour la navigation
 */
const NAVIGATION = {
	CATEGORY_PREFIX: 'logistics_select_category',
	SUBCATEGORY_PREFIX: 'logistics_select_subcategory',
	BACK_TO_CATEGORIES: 'button_logistics_add_material',
};

/**
 * Vérifie les permissions de l'utilisateur sur le matériel
 */
async function checkMaterialPermissions(interaction, translations) {
	const { guild, message, user } = interaction;
	
	const material = await Material.findOne({ 
		guild_id: guild.id, 
		material_id: message.id 
	});

	if (!material) {
		await interaction.reply({
			content: translations.translate('MATERIAL_NOT_EXIST'),
			flags: 64,
		});
		return null;
	}

	if (user.id !== material.owner_id) {
		await interaction.reply({
			content: translations.translate('MATERIAL_ARE_NO_CREATOR_ERROR'),
			flags: 64,
		});
		return null;
	}

	return material;
}

/**
 * Crée des boutons à partir d'une liste de clés
 */
function createButtons(items, customIdPrefix, translationKeyPrefix, translations, style = ButtonStyle.Primary) {
	return items.map(key => {
		const translationKey = `${translationKeyPrefix}_${key.toUpperCase()}`;
		
		return new ButtonBuilder()
			.setCustomId(`${customIdPrefix}-${key}`)
			.setLabel(translations.translate(translationKey))
			.setStyle(style);
	});
}

/**
 * Organise les boutons en lignes (max 5 par ligne)
 */
function organizeIntoRows(buttons, maxPerRow = 5) {
	const rows = [];
	for (let i = 0; i < buttons.length; i += maxPerRow) {
		const rowButtons = buttons.slice(i, i + maxPerRow);
		rows.push(new ActionRowBuilder().addComponents(...rowButtons));
	}
	return rows;
}

/**
 * Crée un menu de sélection pour les matériels
 */
function createMaterialSelectMenu(materials, translations, subcategoryKey, camp, menuNumber) {
	const options = materials.map(material => {
		const desc = material.itemDesc.length > 100 
			? `${material.itemDesc.substring(0, 90)}...` 
			: material.itemDesc;

		return new StringSelectMenuOptionBuilder()
			.setLabel(material.itemName)
			.setDescription(desc)
			.setValue(material.itemName);
	});

	const translationKey = `SUBCATEGORY_${subcategoryKey.toUpperCase()}`;
	const subcategoryName = translations.translate(translationKey);

	return new StringSelectMenuBuilder()
		.setCustomId(`select_logistics_add_material-${menuNumber}`)
		.setPlaceholder(`Liste #${menuNumber} - ${subcategoryName} pour ${camp}`)
		.addOptions(options);
}

/**
 * Handler pour afficher les catégories principales
 */
async function handleCategoriesView(interaction, translations) {
	const material = await checkMaterialPermissions(interaction, translations);
	if (!material) return;

	// Créer les boutons de catégories avec leurs icônes
	const categoryButtons = Object.keys(categories).map(categoryKey => {
		const category = categories[categoryKey];
		const translationKey = `CATEGORY_${categoryKey.toUpperCase()}`;
		
		return new ButtonBuilder()
			.setCustomId(`${NAVIGATION.CATEGORY_PREFIX}-${categoryKey}`)
			.setLabel(translations.translate(translationKey))
			.setEmoji(category.icon)
			.setStyle(ButtonStyle.Primary);
	});

	const buttonBack = new ButtonBuilder()
		.setCustomId('logistics_select_material_back')
		.setLabel(translations.translate('BACK'))
		.setStyle(ButtonStyle.Secondary);

	const rows = organizeIntoRows(categoryButtons);
	rows.push(new ActionRowBuilder().addComponents(buttonBack));

	await interaction.update({
		content: translations.translate('MATERIAL_SELECT_TYPE'),
		components: rows,
	});
}

/**
 * Handler pour afficher les sous-catégories d'une catégorie
 */
async function handleCategoryView(interaction, categoryKey, translations) {
	const material = await checkMaterialPermissions(interaction, translations);
	if (!material) return;

	const category = categories[categoryKey];
	if (!category) {
		console.error(`Unknown category: ${categoryKey}`);
		return await interaction.reply({
			content: 'Erreur: Catégorie inconnue',
			flags: 64,
		});
	}

	// Cas spécial pour les véhicules (afficher directement la liste)
	if (categoryKey === 'vehicles' && Object.keys(category.subcategories).length === 1) {
		return await handleSubcategoryView(interaction, categoryKey, 'vehicles', translations);
	}

	// Créer les boutons de sous-catégories
	const subcategoryKeys = Object.keys(category.subcategories);
	const subcategoryButtons = createButtons(
		subcategoryKeys,
		`${NAVIGATION.SUBCATEGORY_PREFIX}-${categoryKey}`,
		'SUBCATEGORY',
		translations
	);

	const buttonBack = new ButtonBuilder()
		.setCustomId(NAVIGATION.BACK_TO_CATEGORIES)
		.setLabel(translations.translate('BACK'))
		.setStyle(ButtonStyle.Secondary);

	const rows = organizeIntoRows(subcategoryButtons);
	rows.push(new ActionRowBuilder().addComponents(buttonBack));

	const categoryTranslationKey = `CATEGORY_${categoryKey.toUpperCase()}`;
	const content = `${category.icon} **${translations.translate(categoryTranslationKey)}** - ${translations.translate('MATERIAL_SELECT_TYPE')}`;

	await interaction.update({
		content: content,
		components: rows,
	});
}

/**
 * Handler pour afficher les matériels d'une sous-catégorie
 */
async function handleSubcategoryView(interaction, categoryKey, subcategoryKey, translations) {
	const material = await checkMaterialPermissions(interaction, translations);
	if (!material) return;

	const { guild } = interaction;

	// Récupérer le camp du serveur
	const server = await Server.findOne({ guild_id: guild.id }).catch(err => console.error(err));
	if (!server) {
		console.error('No server found for this operation');
		return;
	}

	// Récupérer les matériels
	const allMaterials = getMaterialsBySubcategory(categoryKey, subcategoryKey);
	const materials = allMaterials
		.filter(mat => mat.faction.includes(server.camp))
		.sort((a, b) => a.itemName.localeCompare(b.itemName));

	// Bouton retour vers la catégorie
	const buttonBack = new ButtonBuilder()
		.setCustomId(`${NAVIGATION.CATEGORY_PREFIX}-${categoryKey}`)
		.setLabel(translations.translate('BACK'))
		.setStyle(ButtonStyle.Secondary);

	// Construire le message
	const category = categories[categoryKey];
	const categoryTranslationKey = `CATEGORY_${categoryKey.toUpperCase()}`;
	const subcategoryTranslationKey = `SUBCATEGORY_${subcategoryKey.toUpperCase()}`;

	const headerContent = `${category.icon} **${translations.translate(categoryTranslationKey)}** > ${translations.translate(subcategoryTranslationKey)}`;

	// Si la sous-catégorie est vide, afficher un message
	if (materials.length === 0) {
		const emptyMessage = translations.translate('MATERIAL_SUBCATEGORY_EMPTY') || 
			`\n\n_Aucun matériel disponible dans cette catégorie pour ${server.camp}._`;
		
		await interaction.update({
			content: headerContent + '\n\n' + emptyMessage,
			components: [new ActionRowBuilder().addComponents(buttonBack)],
		});
		return;
	}

	// Créer les menus de sélection (max 25 items par menu)
	const menuRows = [];
	let menuNumber = 1;

	for (let i = 0; i < materials.length; i += 25) {
		const batch = materials.slice(i, i + 25);
		const menu = createMaterialSelectMenu(
			batch,
			translations,
			subcategoryKey,
			server.camp,
			menuNumber++
		);
		menuRows.push(new ActionRowBuilder().addComponents(menu));
	}

	menuRows.push(new ActionRowBuilder().addComponents(buttonBack));

	await interaction.update({
		content: headerContent,
		components: menuRows,
	});
}

/**
 * Router principal pour les interactions de matériel
 */
async function routeMaterialInteraction(interaction) {
	const { client, guild, customId } = interaction;
	const translations = new Translate(client, guild.id);

	// Parser l'ID de l'interaction
	const parts = customId.split('-');
	const action = parts[0];

	try {
		if (action === NAVIGATION.CATEGORY_PREFIX) {
			// Navigation vers une catégorie ou affichage des catégories
			if (parts.length === 1) {
				// Retour à la liste des catégories
				await handleCategoriesView(interaction, translations);
			} else {
				// Affichage d'une catégorie spécifique
				const categoryKey = parts[1];
				await handleCategoryView(interaction, categoryKey, translations);
			}
		} 
		else if (action === NAVIGATION.SUBCATEGORY_PREFIX) {
			// Navigation vers une sous-catégorie
			if (parts.length >= 3) {
				const categoryKey = parts[1];
				const subcategoryKey = parts[2];
				await handleSubcategoryView(interaction, categoryKey, subcategoryKey, translations);
			} else {
				throw new Error('Invalid subcategory format');
			}
		}
	} catch (error) {
		console.error('Error in routeMaterialInteraction:', error);
		await interaction.reply({
			content: translations.translate('MATERIAL_SELECT_ERROR'),
			flags: 64,
		}).catch(() => {});
	}
}

module.exports = {
	handleCategoriesView,
	handleCategoryView,
	handleSubcategoryView,
	routeMaterialInteraction,
	NAVIGATION,
};

const {
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require('discord.js');
const { Server } = require('../data/models.js');
const { categories, getMaterialsBySubcategory } = require('../data/fournis.js');
const { encode } = require('./customId.js');

function createCategoryRows(translations, boardId) {
	const buttons = Object.keys(categories)
		.sort((a, b) => {
			const labelA = translations.translate(`CATEGORY_${a.toUpperCase()}`) ?? a;
			const labelB = translations.translate(`CATEGORY_${b.toUpperCase()}`) ?? b;
			return String(labelA).localeCompare(String(labelB));
		})
		.map((categoryKey) => {
			const category = categories[categoryKey];
			const label = translations.translate(`CATEGORY_${categoryKey.toUpperCase()}`) ?? categoryKey;
			return new ButtonBuilder()
				.setCustomId(encode('order_cat', boardId, categoryKey))
				.setLabel(`${category.icon || ''} ${label}`.trim().slice(0, 80))
				.setStyle(ButtonStyle.Primary);
		});

	const rows = [];
	for (let i = 0; i < buttons.length; i += 5) {
		rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
	}
	return rows;
}

function createSubcategoryRows(boardId, categoryKey, translations) {
	const subs = Object.keys(categories[categoryKey]?.subcategories || {}).sort((a, b) => {
		const labelA = translations.translate(`SUBCATEGORY_${a.toUpperCase()}`) ?? a;
		const labelB = translations.translate(`SUBCATEGORY_${b.toUpperCase()}`) ?? b;
		return String(labelA).localeCompare(String(labelB));
	});

	const buttons = subs.map((subKey) => {
		const label = translations.translate(`SUBCATEGORY_${subKey.toUpperCase()}`) ?? subKey;
		return new ButtonBuilder()
			.setCustomId(encode('order_sub', boardId, `${categoryKey}__${subKey}`))
			.setLabel(String(label).slice(0, 80))
			.setStyle(ButtonStyle.Secondary);
	});

	const rows = [];
	for (let i = 0; i < buttons.length; i += 5) {
		rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
	}

	rows.push(
		new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(encode('order_back', boardId))
				.setLabel(translations.translate('BACK'))
				.setStyle(ButtonStyle.Secondary),
		),
	);

	return rows;
}

async function createMaterialSelectRows(boardId, categoryKey, subcategoryKey, camp, translations) {
	let materials = getMaterialsBySubcategory(categoryKey, subcategoryKey) || [];
	if (camp) {
		materials = materials.filter((m) => !m.faction || m.faction.includes(camp));
	}

	if (materials.length === 0) {
		return {
			content: translations.translate('MATERIAL_SUBCATEGORY_EMPTY'),
			components: [
				new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId(encode('order_cat', boardId, categoryKey))
						.setLabel(translations.translate('BACK'))
						.setStyle(ButtonStyle.Secondary),
				),
			],
		};
	}

	const rows = [];
	let menuNumber = 1;
	for (let i = 0; i < materials.length; i += 25) {
		const batch = materials.slice(i, i + 25);
		const options = batch.map((material) => {
			const desc = (material.itemDesc || '').length > 100
				? `${material.itemDesc.substring(0, 90)}...`
				: (material.itemDesc || material.itemName);
			return new StringSelectMenuOptionBuilder()
				.setLabel(material.itemName.slice(0, 100))
				.setDescription(String(desc).slice(0, 100))
				.setValue(material.itemName.slice(0, 100));
		});

		const subcategoryName = translations.translate(`SUBCATEGORY_${subcategoryKey.toUpperCase()}`) ?? subcategoryKey;
		const menu = new StringSelectMenuBuilder()
			.setCustomId(encode('order_catalog', boardId, categoryKey, String(menuNumber)))
			.setPlaceholder(`${subcategoryName} #${menuNumber}`.slice(0, 150))
			.addOptions(options);

		rows.push(new ActionRowBuilder().addComponents(menu));
		menuNumber += 1;
		if (rows.length >= 4) break;
	}

	rows.push(
		new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(encode('order_cat', boardId, categoryKey))
				.setLabel(translations.translate('BACK'))
				.setStyle(ButtonStyle.Secondary),
		),
	);

	return {
		content: translations.translate('MATERIAL_SELECT_TYPE'),
		components: rows,
	};
}

async function getCamp(guildId) {
	const server = await Server.findOne({ guild_id: guildId });
	return server?.camp || null;
}

module.exports = {
	createCategoryRows,
	createSubcategoryRows,
	createMaterialSelectRows,
	getCamp,
};

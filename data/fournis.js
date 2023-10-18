const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const { Server } = require('./models');
const Fournis = require('./materials.json');

const categoryIcons = {
	'small_arms': '🔫',
	'heavy_arms': '💣',
	'utilities': '🧰',
	'shipables': '📦',
	'vehicles': '🚛',
	'uniforms': '🪖',
};

const names = {
	'small_arms': 'Armes légères',
	'heavy_arms': 'Armes lourdes',
	'utilities': 'Utilitaires',
	'shipables': 'Objets transportables',
	'vehicles': 'Véhicules',
	'uniforms': 'Uniformes',
};

const getIcon = (itemCategory) => categoryIcons[itemCategory] || '❓';

const getFournis = async (guildId) => {
	const server = await Server.findOne({ guild_id: guildId })
		.catch(err => console.error(err));

	if (!server) console.error('No server found for this operation');

	const datas = Object.values(Fournis).filter(value => value.faction.includes(server.camp));

	return { camp: server.camp, datas };
};

const createMenuOption = (item) => {
	const desc = item.itemDesc.length > 100 ? `${item.itemDesc.substring(0, 90)}...` : item.itemDesc;

	return new StringSelectMenuOptionBuilder()
		.setLabel(item.itemName)
		.setDescription(desc)
		.setValue(item.itemName)
		.setEmoji(getIcon(item.itemCategory));
};

const createStringSelectMenu = (category, options, camp, uniqueNumber) => {
	return new StringSelectMenuBuilder()
		.setCustomId(`select_logistics_add_material-${uniqueNumber}`)
		.setPlaceholder(`Liste #${uniqueNumber} des ${names[category]} pour ${camp}`)
		.addOptions(options);
};

const setMenusByCategory = async (category, guildId) => {
	const { camp, datas } = await getFournis(guildId);

	const categoryItems = datas.filter(data => data.itemCategory === category);

	sortByAlphabeticalOrder(categoryItems);

	let uniqueNumber = 1;

	const groups = [];
	for (let i = 0; i < categoryItems.length; i += 25) {
		const group = categoryItems.slice(i, i + 25).map(createMenuOption);
		groups.push(
			createStringSelectMenu(
				category,
				group,
				camp,
				uniqueNumber++,
			),
		);
	}

	return groups;
};

const getCategoryActions = (category) => async (guildId) => {
	const menus = await setMenusByCategory(category, guildId);

	if (menus.length > 4) {
		console.error('Too many menus for one row');
		return;
	}

	return menus.map(menu => new ActionRowBuilder().addComponents(menu));
};

function sortByAlphabeticalOrder(items) {
	items.sort((a, b) => {
		const nameA = a.itemName.toLowerCase();
		const nameB = b.itemName.toLowerCase();

		if (nameA < nameB) return -1;
		if (nameA > nameB) return 1;
		return 0;
	});
}

module.exports = {
	getSmallArms: getCategoryActions('small_arms'),
	getHeavyArms: getCategoryActions('heavy_arms'),
	getUtilities: getCategoryActions('utilities'),
	getShipables: getCategoryActions('shipables'),
	getVehicles: getCategoryActions('vehicles'),
	getUniforms: getCategoryActions('uniforms'),
};

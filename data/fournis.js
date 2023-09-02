const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require("discord.js");
const Fournis = require('./materials.json');

const categoryIcons = {
    "small_arms": "🔫",
    "heavy_arms": "💣",
    "utilities": "🧰",
    "shipables": "📦",
    "vehicles": "🚛",
    "uniforms": "🪖",
};

const names = {
    "small_arms": "Armes légères",
    "heavy_arms": "Armes lourdes",
    "utilities": "Utilitaires",
    "shipables": "Objets transportables",
    "vehicles": "Véhicules",
    "uniforms": "Uniformes",
};

const getIcon = (itemCategory) => categoryIcons[itemCategory] || "❓";

const getFournis = () => {
    return Object.values(Fournis).filter(value => value.faction.includes("warden"));
};

const setStringSelectOption = (item) => {
    const desc = item.itemDesc.length > 100 ? `${item.itemDesc.substring(0, 90)}...` : item.itemDesc;

    return new StringSelectMenuOptionBuilder()
        .setLabel(item.itemName)
        .setDescription(desc)
        .setValue(item.itemName)
        .setEmoji(getIcon(item.itemCategory));
};

const setStringSelectMenu = (group, category, operation, uniqueNumber) => {
    const { operationId, threadId, materialId } = operation;

    return new StringSelectMenuBuilder()
        .setCustomId(`logistics_add_material-${operationId}-${threadId}-${materialId}-${category}_${uniqueNumber}`)
        .setPlaceholder(`Liste #${uniqueNumber} des ${names[category]}`)
        .addOptions(group.map(setStringSelectOption));
};

const getActionsRows = (category, operation) => {
    const menus = setMenusByCategory(category, operation);

    if (menus.length > 4) 
        return console.error("Too many menus for one row")

    return menus.map(menu => new ActionRowBuilder().addComponents(menu));
};

const setMenusByCategory = (category, operation) => {
    const datas = getFournis();
    const categoryItems = datas.filter(value => value.itemCategory === category);

    let uniqueNumber = 1;

    const groups = [];
    for (let i = 0; i < categoryItems.length; i += 25) {
        groups.push(setStringSelectMenu(categoryItems.slice(i, i + 25), category, operation, uniqueNumber));
        uniqueNumber++;
    }

    return groups;
};

module.exports = {
    getSmallArms: (operation) => getActionsRows("small_arms", operation),
    getHeavyArms: (operation) => getActionsRows("heavy_arms", operation),
    getUtilities: (operation) => getActionsRows("utilities", operation),
    getShipables: (operation) => getActionsRows("shipables", operation),
    getVehicles: (operation) => getActionsRows("vehicles", operation),
    getUniforms: (operation) => getActionsRows("uniforms", operation),
};

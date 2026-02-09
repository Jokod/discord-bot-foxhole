const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Stockpile } = require('../../../data/models.js');
const Translate = require('../../../utils/translations.js');
const { getRandomColor } = require('../../../utils/colors.js');

module.exports = {
	init: true,
	data: new SlashCommandBuilder()
		.setName('stockpile')
		.setNameLocalizations({
			fr: 'stock',
			ru: 'склад',
			'zh-CN': '库存',
		})
		.setDescription('Commands for stockpile')
		.setDescriptionLocalizations({
			fr: 'Commandes pour gérer le stockage.',
			ru: 'Команды для управления складом.',
			'zh-CN': '管理库存的命令。',
		})
		.addSubcommand((subcommand) =>
			subcommand
				.setName('help')
				.setNameLocalizations({
					fr: 'aide',
					ru: 'помощь',
					'zh-CN': '帮助',
				})
				.setDescription('Displays the list of commands.')
				.setDescriptionLocalizations({
					fr: 'Affiche la liste des commandes.',
					ru: 'Отображает список команд.',
					'zh-CN': '显示命令列表。',
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('add')
				.setNameLocalizations({
					fr: 'ajouter',
					ru: 'добавить',
					'zh-CN': '加',
				})
				.setDescription('Add a stockpile.')
				.setDescriptionLocalizations({
					fr: 'Ajoute un stock.',
					ru: 'Добавить склад.',
					'zh-CN': '添加库存。',
				})
				.addStringOption((option) =>
					option
						.setName('name')
						.setNameLocalizations({
							fr: 'nom',
							ru: 'имя',
							'zh-CN': '名称',
						})
						.setDescription('The name of the stockpile.')
						.setDescriptionLocalizations({
							fr: 'Le nom du stock.',
							ru: 'Имя склада.',
							'zh-CN': '库存名称。',
						})
						.setMinLength(3)
						.setMaxLength(16)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName('password')
						.setNameLocalizations({
							fr: 'password',
							ru: 'пароль',
							'zh-CN': '密码',
						})
						.setDescription('The password of the stockpile.')
						.setDescriptionLocalizations({
							fr: 'Le mot de passe du stock.',
							ru: 'Пароль склада.',
							'zh-CN': '库存密码。',
						})
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('remove')
				.setNameLocalizations({
					fr: 'supprimer',
					ru: 'удалить',
					'zh-CN': '删除',
				})
				.setDescription('Remove a stockpile.')
				.setDescriptionLocalizations({
					fr: 'Supprime un stock.',
					ru: 'Удалить склад.',
					'zh-CN': '删除库存。',
				})
				.addStringOption((option) =>
					option
						.setName('id')
						.setNameLocalizations({
							fr: 'id',
							ru: 'идентификатор',
							'zh-CN': '鉴定',
						})
						.setDescription('The id of the stockpile.')
						.setDescriptionLocalizations({
							fr: 'L\'id du stock.',
							ru: 'Идентификатор склада.',
							'zh-CN': '库存的ID。',
						})
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('list')
				.setNameLocalizations({
					fr: 'liste',
					ru: 'список',
					'zh-CN': '名单',
				})
				.setDescription('Displays the list of stockpiles.')
				.setDescriptionLocalizations({
					fr: 'Affiche la liste des stocks.',
					ru: 'Отображает список складов.',
					'zh-CN': '显示库存列表。',
				}),
		),
	async execute(interaction) {
		const { client, guild, options } = interaction;
		const translations = new Translate(client, guild.id);
		const subcommand = options.getSubcommand();

		const validateName = (name) => /^[a-zA-Z0-9_ ]{1,50}$/.test(name);
		const validatePassword = (password) => /^[a-zA-Z0-9_]{1,20}$/.test(password);
		const validateId = (id) => /^\d+$/.test(id);

		switch (subcommand) {
		case 'help':
			const commandNames = client.slashCommands
				.filter((command) => command.data.name === 'stockpile')
				.map((command) => command.data.options.map((option) => option.name))
				.flat()
				.join(', ');

			const helpEmbed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(translations.translate('STOCKPILE_LIST_COMMANDS'))
				.setDescription(`\`${commandNames}\``);

			await interaction.reply({
				embeds: [helpEmbed],
				flags: 64,
			});
			break;

		case 'add':
			const stockName = options.getString('name');
			const password = options.getString('password');

			if (!validateName(stockName)) {
				return await interaction.reply({
					content: translations.translate('STOCKPILE_INVALID_NAME'),
					flags: 64,
				});
			}

			if (!validatePassword(password)) {
				return await interaction.reply({
					content: translations.translate('STOCKPILE_INVALID_PASSWORD'),
					flags: 64,
				});
			}

			await Stockpile.create({
				id: interaction.id,
				server_id: guild.id,
				name: stockName,
				password: password,
			});

			await interaction.reply({
				content: translations.translate('STOCKPILE_CREATE_SUCCESS'),
				flags: 64,
			});
			break;

		case 'remove':
			const stockId = options.getString('id');

			if (!validateId(stockId)) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_INVALID_ID'),
					flags: 64,
				});
			}

			const stock = await Stockpile.findOne({ server_id: guild.id, id: stockId });

			if (!stock || stock.server_id !== guild.id) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_NOT_EXIST'),
					flags: 64,
				});
			}

			await Stockpile.deleteOne({ server_id: guild.id, id: stockId });

			await interaction.reply({
				content: translations.translate('STOCKPILE_DELETE_SUCCESS'),
				flags: 64,
			});
			break;

		case 'list':
			const stocks = await Stockpile.find({ server_id: guild.id });

			if (stocks.length === 0) {
				return interaction.reply({
					content: translations.translate('STOCKPILE_LIST_EMPTY'),
					flags: 64,
				});
			}

			const stockList = stocks.map((s) => {
				return `**ID:** ${s.id} - **${translations.translate('NAME')}:** ${s.name} - **${translations.translate('PASSWORD')}:** ${s.password}`;
			});

			const embed = new EmbedBuilder()
				.setColor(getRandomColor())
				.setTitle(translations.translate('STOCKPILE_LIST'))
				.setDescription(stockList.join('\n\n'));

			await interaction.reply({
				embeds: [embed],
				flags: 64,
			});
			break;

		default:
			return interaction.reply({
				content: translations.translate('COMMAND_UNKNOWN'),
				flags: 64,
			});
		}
	},
};
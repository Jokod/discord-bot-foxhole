module.exports = {
	name: 'Russian',
	code: 'ru',

	// DEFAULT
	COMMAND_UNKNOWN: 'Эта команда не существует.',
	NONE: 'Нет',
	NAME: 'Имя',
	PASSWORD: 'Пароль',
	QUANTITY: 'Количество',
	DELETE: 'Удалить',
	DATE: 'Дата',
	HOURS: 'Часы',
	DURATION: 'Продолжительность',
	DESCRIPTION: 'Описание',
	START: 'Начать',
	CANCEL: 'Отменить',
	FINISHED: 'Завершено',
	CONFIRM: 'Подтвердить',
	BACK: 'Назад',
	INTERACTION_ERROR: 'Для этого действия не найдено взаимодействия.',
	PREFIX_MESSAGE: 'Привет %author%! Мой префикс - %prefix%, для справки %prefix%help',
	STATUS: 'Статус',

	// ABOUT / LINKS
	ABOUT_GITHUB: '**GitHub:** %url%',
	ABOUT_DISCORD: '**Discord:** %url%',
	ABOUT_MESSAGE: 'Вы можете следить за обновлениями и участвовать в улучшении: предлагать pull requests (обновление материала фракций, новые команды) или создавать issues.',
	ABOUT_NOT_CONFIGURED: 'Ссылки поддержки не настроены.',

	// FOXHOLE
	FOXHOLE_TITLE: 'Foxhole – Игроки и война',
	FOXHOLE_PLAYERS_CURRENT: 'Игроков в сети',
	FOXHOLE_WAR_TITLE: 'Текущая война',
	FOXHOLE_WAR_NUMBER: 'Война №',
	FOXHOLE_WAR_WINNER: 'Победитель',
	FOXHOLE_WAR_REQUIRED_TOWNS: 'Городов для победы',
	FOXHOLE_WAR_START: 'Начало завоевания',
	FOXHOLE_WINNER_NONE: 'В процессе',
	FOXHOLE_WINNER_WARDEN: 'Warden',
	FOXHOLE_WINNER_COLONIAL: 'Colonial',
	FOXHOLE_UNAVAILABLE: 'Данные недоступны',
	FOXHOLE_ALL_UNAVAILABLE: 'Внешние сервисы (Steam, Foxhole) не отвечают. Попробуйте позже.',

	HELP_NO_SUBCOMMANDS: 'У этой команды нет подкоманд.',
	HELP_NO_PARAMS: 'У этой команды нет параметров.',

	HELP_TITLE_LIST: 'Список команд',
	HELP_TITLE_COMMAND: 'Справка по команде `%command%`',

	HELP_SECTION_SUBCOMMANDS: 'Подкоманды',
	HELP_SECTION_PARAMETERS: 'Параметры',
	HELP_COMMAND_NOT_FOUND: 'Команда `%command%` не существует!',
	HELP_PARAM_REQUIRED_SUFFIX: ' (обязательно)',
	HELP_PARAM_HELP_COMMAND_VALUES: 'Доступные значения: %commands%',

	COMMAND_EXECUTE_ERROR: 'Произошла ошибка при выполнении команды.',
	OWNER_ONLY: 'Эта команда доступна только владельцу бота.',
	NO_DM: 'Я не могу выполнить эту команду в личных сообщениях!',
	NO_PERMS: 'У вас нет прав для использования этой команды.',
	ARGS_MISSING: 'Ты не предоставил аргументы, %author%!',
	COMMAND_USAGE: 'Правильное использование: `%prefix%%command% %usage%`',
	COMMAND_COOLDOWN: 'Пожалуйста, подождите %time% секунд, прежде чем использовать команду `%command%` снова.',

	// SERVER ---------------------------------------------

	// SERVER INIT
	SERVER_IS_ALREADY_INIT: 'Этот сервер уже инициализирован.',
	SERVER_IS_INIT: 'Сервер был инициализирован.',
	SERVER_IS_NOT_INIT: 'Сервер не инициализирован, используйте команду "/setup" для инициализации.',

	// SERVER SHOW CONFIGURATION
	SERVER_TITLE_CONFIGURATION: 'Конфигурация сервера',
	SERVER_FIELD_GUILD_NAME: 'Имя сервера',
	SERVER_FIELD_GUILD_ID: 'Идентификатор сервера',
	SERVER_FIELD_GUILD_LANG: 'Язык сервера',
	SERVER_FIELD_GUILD_CAMP: 'Лагерь сервера',
	SERVER_FIELD_GUILD_LOGS: 'Треды логов заказов',
	SERVER_LOGS_ENABLED: 'Включено',
	SERVER_LOGS_DISABLED: 'Отключено',

	// SERVER SETUP
	SERVER_SET_LANG_REPLY: 'Язык сервера был изменен на **%lang%**.',
	SERVER_SET_CAMP_REPLY: 'Лагерь сервера был изменен на **%camp%**.',
	SERVER_SET_LOGS_ON_REPLY: 'Треды логов досок заказов **включены**. Новые доски будут создавать заблокированный тред логов.',
	SERVER_SET_LOGS_OFF_REPLY: 'Треды логов досок заказов **отключены**. Существующие треды логов удалены.',
	SERVER_RESET_PREVIEW: 'Предпросмотр сброса — будет удалено **%boards%** доск(и), **%stockpiles%** склад(ов), **%operations%** операци(й). Повторите с **подтвердить:true**.',
	SERVER_RESET_CONFIRM_REQUIRED: 'Укажите **подтвердить:true**, чтобы удалить доски заказов, склады и операции для новой войны. Это необратимо.',
	SERVER_RESET_SUCCESS: 'Сброс сервера выполнен — удалено **%boards%** доск(и), **%stockpiles%** склад(ов), **%operations%** операци(й). Конфиг сервера и уведомления сохранены.',

	// OPERATION ---------------------------------------------
	OPERATION_CREATOR: 'Создатель',

	// OPERATION CREATE
	OPERATION_CREATE_TITLE: 'Операция %title%',
	OPERATION_CREATE_LABEL_DATE: 'Дата операции (дд/мм/гггг)',
	OPERATION_CREATE_LABEL_TIME: 'Время операции (чч:мм)',
	OPERATION_CREATE_LABEL_DURATION: 'Продолжительность операции (в минутах)',
	OPERATION_CREATE_LABEL_DESCRIPTION: 'Описание операции',

	// OPERATION GROUP
	OPERATION_NOT_EXIST: 'Эта операция не существует.',
	OPERATION_NOT_HAVE_GROUPS: 'У этой операции нет групп.',

	// OPERATION SUCCESS
	OPERATION_CREATE_SUCCESS: 'Операция %title% была создана.',
	OPERATION_LAUNCH_SUCCESS: 'Операция %title% была запущена!.',
	OPERATION_FINISHED_SUCCESS: 'Операция %title% завершена!',
	OPERATION_CANCELED_SUCCESS: 'Операция %title% отменена!',

	// OPERATION ERRORS
	OPERATION_TITLE_FORMAT_ERROR: 'Заголовок должен быть буквенно-цифровым без специальных символов.',
	OPERATION_CREATE_ERROR: 'Произошла ошибка при создании операции.',
	OPERATION_DATE_FORMAT_ERROR: 'Неверный формат даты.',
	OPERATION_TIME_FORMAT_ERROR: 'Неверный формат времени.',
	OPERATION_DURATION_FORMAT_ERROR: 'Неверный формат продолжительности.',
	OPERATION_DESCRIPTION_FORMAT_ERROR: 'Неверный формат описания.',
	OPERATION_LAUNCH_ERROR: 'Произошла ошибка при запуске операции.',
	OPERATION_FINISHED_ERROR: 'Произошла ошибка при завершении операции.',
	OPERATION_CANCELED_ERROR: 'Произошла ошибка при отмене операции.',
	OPERATION_ARE_NO_OWNER_ERROR: 'Вы не являетесь владельцем этой операции.',

	// MATERIAL ---------------------------------------------

	MATERIAL: 'Материал',
	MATERIAL_PRIORITY: 'Приоритет',
	MATERIAL_PRIORITY_LOW: 'Низкий',
	MATERIAL_PRIORITY_NEUTRAL: 'Нейтральный',
	MATERIAL_PRIORITY_HIGH: 'Высокий',
	MATERIAL_URGENCY_URGENT: 'СРОЧНО',
	MATERIAL_URGENCY_LOW: 'НИЗКО',
	MATERIAL_URGENCY_OK: 'OK',

	// ORDER BOARDS (prod / transfer / scrap) -----------------
	ORDER_KIND_PROD: 'Заказ на производство',
	ORDER_KIND_TRANSFER: 'Доставка на фронт',
	ORDER_KIND_SCRAP: 'Scrap / фарм',
	ORDER_EMPTY: 'Пока нет строк.\nНажмите **Добавить**, чтобы выбрать предмет и цель.',
	ORDER_LINKED_OPERATION: 'Операция: **%title%**',
	ORDER_STATUS_CLOSED: 'Эта доска заказа закрыта. Владелец или модератор может открыть её снова кнопкой **Открыть снова**.',
	ORDER_STATUS_ALREADY_OPEN: 'Эта доска заказа уже открыта.',
	ORDER_SUMMARY: '**%done%/%total%** готово · **%current%/%target%** ящиков · осталось **%remaining%**',
	ORDER_LINE_LEFT: 'осталось %n%',
	ORDER_STOCK: 'Сток: %current%/%target%',
	ORDER_FOOTER: '%lines% строк(и) · %status%',
	ORDER_STATUS_LABEL_OPEN: 'Открыт',
	ORDER_STATUS_LABEL_CLOSED: 'Закрыт',
	ORDER_SELECT_PLACEHOLDER: 'Выберите строку',
	ORDER_SELECT_PLACEHOLDER_RANGE: 'Выберите строку (%from%–%to%)',
	ORDER_NO_SELECTION: 'Сначала выберите строку.',
	ORDER_ADD: 'Добавить',
	ORDER_CORRECT: 'Исправить',
	ORDER_CLOSE: 'Закрыть',
	ORDER_REOPEN: 'Открыть снова',
	ORDER_DELETE_LINE: 'Удалить',
	ORDER_MAX: 'Макс',
	ORDER_CORRECT_TITLE: 'Исправить строку',
	ORDER_ADD_TARGET_TITLE: 'Целевое количество',
	ORDER_FULL: 'Доска заполнена (**%max%/%max%** строк — лимит: 2×25). Используйте **Удалить** перед добавлением.',
	ORDER_FULL_BANNER: '⚠️ **ПОЛНО — %count%/%max% строк** (лимит: 2×25). Добавление невозможно.',
	ORDER_CURRENT: 'Сейчас',
	ORDER_TARGET: 'Цель',
	ORDER_NOT_EXIST: 'Нет доски **%name%** в этом канале. Используйте `/order create`.',
	ORDER_BOARD_NOT_EXIST: 'Эта доска заказа больше не существует.',
	ORDER_ALREADY_EXISTS: 'Доска **%name%** уже есть в этом канале.',
	ORDER_INVALID_NAME: 'Недопустимое имя доски.',
	ORDER_INVALID_TARGET: 'Введите корректное количество (сейчас ≥ 0, цель ≥ 1).',
	ORDER_EMBED_TRUNCATED: '…и ещё (показана часть из %count% строк — используйте селекты).',
	ORDER_CANNOT_MANAGE_ERROR: 'Вы не можете управлять этим заказом (владелец строки/доски или управляющий сервером/каналом).',
	ORDER_OPERATION_FINISHED: 'Эта операция завершена — выберите активную (автодополнение).',
	ORDER_LINE_NOT_EXIST: 'Эта строка больше не существует.',
	ORDER_LIST_COMMANDS: 'Команды заказов',
	ORDER_LOG_THREAD: 'Лог — %name%',
	ORDER_LOG_QTY: '%user% **%name%** %from%→%to% (%delta%)',
	ORDER_LOG_MAX: '%user% **%name%** Макс %from%→%to%',
	ORDER_LOG_PRIORITY: '%user% **%name%** приоритет → %priority%',
	ORDER_LOG_ADD: '%user% добавил **%name%** (цель %target%)',
	ORDER_LOG_CORRECT: '%user% исправил **%name%** → %current%/%target%',
	ORDER_LOG_CLOSE: '%user% закрыл доску.',
	ORDER_LOG_REOPEN: '%user% снова открыл доску.',
	ORDER_LOG_DELETE_LINE: '%user% удалил **%name%**.',

	MATERIAL_SELECT_TYPE: 'Выберите тип материала для добавления',
	MATERIAL_SELECT_CATEGORY: 'Выберите категорию',
	MATERIAL_SELECT_SUBCATEGORY: 'Выберите подкатегорию',


	// Новые категории
	CATEGORY_UTILITIES: 'Утилиты',
	CATEGORY_INFANTRY_WEAPONS: 'Пехотное оружие',
	CATEGORY_AMMUNITION: 'Боеприпасы',
	CATEGORY_RESOURCES: 'Ресурсы',
	CATEGORY_VEHICLES: 'Транспорт',

	// Подкатегории Утилиты
	SUBCATEGORY_TOOLS: 'Инструменты',
	SUBCATEGORY_FIELD_EQUIPMENT: 'Полевое оборудование',
	SUBCATEGORY_MOUNTED_EQUIPMENT: 'Установленное оборудование',
	SUBCATEGORY_MEDICAL: 'Медицинское',
	SUBCATEGORY_UNIFORMS: 'Униформа',
	SUBCATEGORY_OUTFITS: 'Наряды',

	// Подкатегории Пехотное оружие
	SUBCATEGORY_SMALL_ARMS: 'Легкое оружие',
	SUBCATEGORY_MELEE_WEAPONS: 'Холодное оружие',
	SUBCATEGORY_MACHINE_GUNS: 'Пулеметы',
	SUBCATEGORY_HEAVY_ARMS: 'Тяжелое оружие',
	SUBCATEGORY_GRENADES: 'Гранаты',
	SUBCATEGORY_LAUNCHERS: 'Гранатометы',
	SUBCATEGORY_MORTAR: 'Минометы',

	// Подкатегории Боеприпасы
	SUBCATEGORY_LIGHT_AMMO: 'Легкие боеприпасы',
	SUBCATEGORY_TANK_AMMO: 'Танковые боеприпасы',
	SUBCATEGORY_AIRCRAFT_AMMO: 'Авиационные боеприпасы',
	SUBCATEGORY_ARTILLERY_AMMO: 'Артиллерийские боеприпасы',
	SUBCATEGORY_MISC_AMMO: 'Разные боеприпасы',
	SUBCATEGORY_FLAMETHROWER_AMMO: 'Огнеметные боеприпасы',

	// Подкатегории Ресурсы
	SUBCATEGORY_BMAT: 'Базовые материалы',
	SUBCATEGORY_EMAT: 'Взрывчатые материалы',
	SUBCATEGORY_HEMAT: 'Тяжелые взрывчатые материалы',
	SUBCATEGORY_RMAT: 'Очищенные материалы',
	SUBCATEGORY_GRAVEL: 'Гравий',
	SUBCATEGORY_SALVAGE: 'Утиль',
	SUBCATEGORY_COMPONENTS: 'Компоненты',
	SUBCATEGORY_SULFUR: 'Сера',
	SUBCATEGORY_COAL: 'Уголь',
	SUBCATEGORY_FUEL: 'Топливо',

	// Подкатегории Транспорт
	SUBCATEGORY_VEHICLES: 'Транспортные средства',

	MATERIAL_SUBCATEGORY_EMPTY: 'В этой категории нет доступных материалов.',

	// MATERIAL SUCCESS

	// MATERIAL ERRORS

	// STOCKPILE ---------------------------------------------

	STOCKPILE: 'Склад',
	STOCKPILE_LIST_COMMANDS: 'Список команд склада',
	STOCKPILE_LIST: 'Список запасов',
	STOCKPILE_LIST_CODES: 'Список кодов складов',
	STOCKPILE_TABLE_HEADER_STOCK: 'Склад',
	STOCKPILE_TABLE_HEADER_CODE: 'Код',
	STOCKPILE_TABLE_HEADER_EXPIRES: 'Дата',
	STOCKPILE_REGION: 'Регион',
	STOCKPILE_CITY: 'Город',
	STOCKPILE_PLACEHOLDER_REGION: 'Буквы, цифры, пробелы, дефисы (2-50)',
	STOCKPILE_PLACEHOLDER_CITY: 'Название города (2-50)',
	STOCKPILE_PLACEHOLDER_NAME: '3-50 символов, буквы и цифры',
	STOCKPILE_PLACEHOLDER_CODE: '6 цифр, напр. 123456',

	STOCKPILE_TIME_REMAINING: 'Оставшееся время',
	STOCKPILE_CREATOR: 'Создатель',

	// STOCKPILE SUCCESS
	STOCKPILE_CREATE_SUCCESS: 'Склад #%id% был создан.',
	STOCKPILE_DELETE_SUCCESS: 'Склад #%id% был удален.',
	STOCKPILE_MARK_DELETED_SUCCESS: 'Склад #%id% был помечен как удалён.',
	STOCKPILE_RESET_SUCCESS: 'Таймер склада #%id% сброшен на 2 дня и 2 часа.',
	STOCKPILE_CLEANUP_SUCCESS: 'Окончательно удалено %count% помеченных складов на этом сервере.',
	STOCKPILE_RESET_ALL_SUCCESS: 'Все склады были удалены.',
	STOCKPILE_REMOVE_PLACEHOLDER: 'Пометить склад удалённым…',
	STOCKPILE_BTN_CLEANUP: 'Очистка',
	STOCKPILE_BTN_DELETEALL: 'Удалить всё',

	// STOCKPILE ERRORS
	STOCKPILE_LIST_EMPTY: 'Здесь нет складов.',
	STOCKPILE_NOT_EXIST: 'Этого склада не существует.',
	STOCKPILE_INVALID_ID: 'Идентификатор склада недействителен.',
	STOCKPILE_MAX_REACHED: 'Достигнуто максимальное количество активных складов.',
	STOCKPILE_CREATE_ERROR: 'Произошла ошибка при создании склада.',
	STOCKPILE_DELETE_ERROR: 'Произошла ошибка при удалении склада.',
	STOCKPILE_INVALID_NAME: 'Недопустимое имя склада.',
	STOCKPILE_INVALID_PASSWORD: 'Код должен содержать ровно 6 цифр.',
	STOCKPILE_INVALID_REGION: 'Недопустимый регион склада.',
	STOCKPILE_INVALID_CITY: 'Недопустимый город склада.',
	STOCKPILE_ALREADY_DELETED: 'Этот склад уже помечен как удалён.',
	STOCKPILE_ARE_NO_OWNER_ERROR: 'Вы не являетесь создателем этого склада.',
	STOCKPILE_NOT_DELETED: 'Этот склад не помечен как удалённый.',
	STOCKPILE_RESTORE_SUCCESS: 'Склад восстановлен.',

	// NOTIFICATIONS
	NOTIFICATION_TYPE_STOCKPILE_ACTIVITY: 'Активность складов',
	NOTIFICATION_NO_PERMS: 'Нужно право «Управление каналами» для подписки или отписки.',
	NOTIFICATION_SUBSCRIBE_SUCCESS: 'Этот канал подписан на выбранный тип уведомлений.',
	NOTIFICATION_UNSUBSCRIBE_SUCCESS: 'Этот канал больше не подписан.',
	NOTIFICATION_ALREADY_SUBSCRIBED: 'Этот канал уже подписан на этот тип уведомлений.',
	NOTIFICATION_NOT_SUBSCRIBED: 'Этот канал не подписан на этот тип уведомлений.',
	NOTIFICATION_LIST_EMPTY: 'Нет каналов с подпиской на уведомления на этом сервере.',
	NOTIFICATION_LIST_HEADER: '**Подписки на уведомления**',
	NOTIFICATION_STOCKPILE_ADDED: '📦 %user% добавил склад **%name%** (#%id%) в %region% / %city%.',
	NOTIFICATION_STOCKPILE_REMOVED: '🗑️ %user% помечен склад **%name%** (#%id%) как удалённый.',
	NOTIFICATION_STOCKPILE_RESTORED: '♻️ %user% восстановил склад **%name%** (#%id%).',
	NOTIFICATION_STOCKPILE_RESET: '🔄 %user% сбросил таймер склада **%name%** (#%id%).',
	NOTIFICATION_TYPE_STOCKPILE_EXPIRING: 'Склады скоро истекают',
	NOTIFICATION_STOCKPILE_EXPIRING_ALERT: '⏰ **Напоминание о складах**',
	NOTIFICATION_STOCKPILE_EXPIRING_LINE: '• %creator%#%id% **%name%** — %region% / %city% — %window%',
	NOTIFICATION_EXPIRING_IN_12H: 'через 12 ч',
	NOTIFICATION_EXPIRING_IN_6H: 'через 6 ч',
	NOTIFICATION_EXPIRING_IN_3H: 'через 3 ч',
	NOTIFICATION_EXPIRING_IN_2H: 'через 2 ч',
	NOTIFICATION_EXPIRING_IN_1H: 'через 1 ч',
	NOTIFICATION_EXPIRING_IN_30M: 'через 30 мин',

	// NEWSLETTER
	NEWSLETTER_NO_PERMS: 'Нужно право « Управление сервером » для подписки или отписки.',
	NEWSLETTER_SUBSCRIBE_SUCCESS: 'Этот канал подписан на рассылку бота.',
	NEWSLETTER_UNSUBSCRIBE_SUCCESS: 'Этот канал больше не подписан на рассылку бота.',
	NEWSLETTER_ALREADY_SUBSCRIBED: 'Этот канал уже подписан на рассылку бота.',
	NEWSLETTER_NOT_SUBSCRIBED: 'Этот канал не подписан на рассылку бота.',
};
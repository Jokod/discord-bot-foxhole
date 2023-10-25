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
	VALIDATE: 'Подтвердить',
	VALIDATED: 'Подтверждено',
	PENDING: 'Ожидание',
	LOGISTICS: 'Логистика',
	ASSIGNEE: 'Исполнитель',
	REVOKE: 'Отозвать',
	BACK: 'Назад',
	INTERACTION_ERROR: 'Для этого действия не найдено взаимодействия.',
	PREFIX_MESSAGE: 'Привет %author%! Мой префикс - %prefix%, для справки %prefix%help',
	STATUS: 'Статус',

	// COMMANDS

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

	// SERVER SETUP
	SERVER_SET_LANG_REPLY: 'Язык сервера был изменен на **%lang%**.',
	SERVER_SET_CAMP_REPLY: 'Лагерь сервера был изменен на **%camp%**.',

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

	// OPERATION BUTTONS


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

	// GROUP ---------------------------------------------
	GROUP_NOT_EXIST: 'Эта группа не существует.',
	THREAD_NOT_EXIST: 'Эта ветка не существует.',
	THREAD_CLOSED_OR_ARCHIVED: 'Эта ветка закрыта или архивирована.',
	GROUPS_OF_OPERATION: 'Группы операций %title%',

	GROUP_TITLE: 'Логистика #%size% для операции %title%',

	// GROUP SUCCESS
	GROUP_CREATE_SUCCESS: 'Создана логистическая ветка!',

	// GROUP ERRORS
	GROUP_CREATE_ERROR: 'Произошла ошибка при создании логистики!',
	THREAD_CLOSE_ERROR: 'Произошла ошибка при закрытии ветки!',
	THREAD_ARE_NO_OWNER_ERROR: 'Вы не являетесь владельцем этой ветки!',
	GROUP_NO_MATERIALS: 'В этой группе нет материалов.',

	// LOGISTIC ---------------------------------------------

	LOGISTIC_LIST_COMMANDS: 'Список логистических команд',

	// MATERIAL ---------------------------------------------

	MATERIAL: 'Материал',
	MATERIAL_NOT_EXIST: 'Этот материал не существует.',
	MATERIAL_DETAIL: 'Подробности о материале',
	MATERIAL_ADD: 'Добавить материал',
	MATERIAL_REMOVE: 'Удалить материал',
	MATERIAL_SELECT_QUANTITY: 'Выберите количество',
	MATERIAL_CONFIRMATION: 'Подтвердить материал',
	MATERIAL_REVOKE: 'Отозвать материал',
	MATERIAL_ENTER_ID: 'Введите идентификатор материала',

	MATERIAL_NOMBER: 'Количество материалов',
	MATERIAL_VALIDATE: 'Подтвержденные материалы',
	MATERIAL_INVALIDATE: 'Неподтвержденные материалы',
	MATERIAL_QUANTITY_ASK: 'Запрошенное количество',
	MATERIAL_QUANTITY_GIVEN: 'Предоставленное количество',
	MATERIAL_CREATOR: 'Создатель',
	MATERIAL_PERSON_IN_CHARGE: 'Ответственный',
	MATERIAL_LIST_OF_GROUP: 'Список материалов группы',
	MATERIAL_LOCALIZATION: 'Местоположение хранения',
	MATERIAL_HAVE_NO_NAME_OR_QUANTITY: 'У материала должны быть имя и количество.',
	MATERIAL_SELECT_TYPE: 'Выберите тип материала для добавления',
	MATERIAL_SMALL_ARMS: 'Малое оружие',
	MATERIAL_HEAVY_ARMS: 'Тяжелое оружие',
	MATERIAL_UTILITIES: 'Утилиты',
	MATERIAL_SHIPABLES: 'Товары для отправки',
	MATERIAL_VEHICLES: 'Транспортные средства',
	MATERIAL_UNIFORMS: 'Униформа',
	MATERIAL_RESOURCES: 'Ресурсы',

	MATERIAL_LIST_SMALL_ARMS: 'Список доступного малого оружия',
	MATERIAL_LIST_HEAVY_ARMS: 'Список доступного тяжелого оружия',
	MATERIAL_LIST_UTILITIES: 'Список доступных утилит',
	MATERIAL_LIST_SHIPABLES: 'Список доступных товаров для отправки',
	MATERIAL_LIST_VEHICLES: 'Список доступных транспортных средств',
	MATERIAL_LIST_UNIFORMS: 'Список доступной униформы',
	MATERIAL_LIST_RESOURCES: 'Список доступных ресурсов',
	// MATERIAL SUCCESS
	MATERIAL_CREATE_SUCCESS: 'Материал был создан.',
	MATERIAL_DELETE_SUCCESS: 'Материал был удален.',

	// MATERIAL ERRORS
	MATERIAL_CREATE_ERROR: 'Произошла ошибка при создании материала.',
	MATERIAL_UPDATE_ERROR: 'Произошла ошибка при обновлении материала.',
	MATERIAL_DELETE_ERROR: 'Произошла ошибка при удалении материала.',
	MATERIAL_SELECT_ERROR: 'Произошла ошибка при выборе материала.',
	MATERIAL_VALIDATE_ERROR: 'Произошла ошибка при подтверждении материала.',
	MATERIAL_CONFIRM_ERROR: 'Произошла ошибка при подтверждении материала.',
	MATERIAL_ASSIGN_ERROR: 'Произошла ошибка при назначении материала.',
	MATERIAL_ARE_NO_CREATOR_ERROR: 'Вы не являетесь создателем этого материала.',
	MATERIAL_ARE_NO_OWNER_ERROR: 'Вы не являетесь владельцем этого материала.',
	MATERIAL_QUANTITY_ERROR: 'Количество должно быть положительным числом.',
	MATERIAL_SELECT_QUANTITY_ERROR: 'Произошла ошибка при выборе количества.',
	MATERIAL_LOCALIZATION_ERROR: 'Неверный формат местоположения.',
	MATERIAL_BACK_ERROR: 'Произошла ошибка при возврате к предыдущему меню.',

	// STOCKPILE ---------------------------------------------

	STOCKPILE: 'Склад',
	STOCKPILE_LIST_COMMANDS: 'Список команд склада',
	STOCKPILE_LIST: 'Список запасов',

	// STOCKPILE SUCCESS
	STOCKPILE_CREATE_SUCCESS: 'Склад был создан.',
	STOCKPILE_DELETE_SUCCESS: 'Склад был удален.',

	// STOCKPILE ERRORS
	STOCKPILE_LIST_EMPTY: 'Здесь нет складов.',
	STOCKPILE_NOT_EXIST: 'Этого склада не существует.',
	STOCKPILE_INVALID_ID: 'Идентификатор склада недействителен.',
	STOCKPILE_CREATE_ERROR: 'Произошла ошибка при создании склада.',
	STOCKPILE_DELETE_ERROR: 'Произошла ошибка при удалении склада.',
	STOCKPILE_INVALID_NAME: 'Недопустимое имя склада.',
	STOCKPILE_INVALID_PASSWORD: 'Пароль недействителен.',
};
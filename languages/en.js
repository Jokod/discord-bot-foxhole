module.exports = {
	name: 'English',
	code: 'en',

	// DEFAULT
	COMMAND_UNKNOWN: 'This command does not exist.',
	NONE: 'None',
	NAME: 'Name',
	PASSWORD: 'Password',
	QUANTITY: 'Quantity',
	DELETE: 'Delete',
	DATE: 'Date',
	HOURS: 'Hours',
	DURATION: 'Duration',
	DESCRIPTION: 'Description',
	START: 'Start',
	CANCEL: 'Cancel',
	FINISHED: 'Finished',
	CONFIRM: 'Confirm',
	VALIDATE: 'Validate',
	VALIDATED: 'Validated',
	PENDING: 'Pending',
	CONFIRMED: 'Confirmed',
	LOGISTICS: 'Logistics',
	ASSIGNEE: 'Assignee',
	REVOKE: 'Revoke',
	BACK: 'Back',
	INTERACTION_ERROR: 'No interaction was found for this action.',
	PREFIX_MESSAGE: 'Hi %author%! My prefix is %prefix%, for help %prefix%help',
	STATUS: 'Status',

	// COMMANDS

	// GITHUB
	GITHUB_REPLY: 'Repository link: %url%',
	GITHUB_MESSAGE: 'You can follow updates and contribute by opening pull requests: help keep faction material up to date, suggest new commands, or report issues.',
	GITHUB_NOT_CONFIGURED: 'GitHub link is not configured.',

	// FOXHOLE
	FOXHOLE_TITLE: 'Foxhole – Players & War',
	FOXHOLE_PLAYERS_CURRENT: 'Players online',
	FOXHOLE_WAR_TITLE: 'Current war',
	FOXHOLE_WAR_NUMBER: 'War #',
	FOXHOLE_WAR_WINNER: 'Winner',
	FOXHOLE_WAR_REQUIRED_TOWNS: 'Towns to win',
	FOXHOLE_WAR_START: 'Conquest start',
	FOXHOLE_WINNER_NONE: 'In progress',
	FOXHOLE_WINNER_WARDEN: 'Warden',
	FOXHOLE_WINNER_COLONIAL: 'Colonial',
	FOXHOLE_UNAVAILABLE: 'Data unavailable',
	FOXHOLE_ALL_UNAVAILABLE: 'External services (Steam, Foxhole) are not responding. Try again later.',

	HELP_NO_SUBCOMMANDS: 'This command has no subcommands.',
	HELP_NO_PARAMS: 'This command has no parameters.',

	HELP_TITLE_LIST: 'List of commands',
	HELP_TITLE_COMMAND: 'Help for the command `%command%`',

	HELP_SECTION_SUBCOMMANDS: 'Subcommands',
	HELP_SECTION_PARAMETERS: 'Parameters',
	HELP_COMMAND_NOT_FOUND: 'The command `%command%` doesn\'t exist!',
	HELP_PARAM_REQUIRED_SUFFIX: ' (required)',

	COMMAND_EXECUTE_ERROR: 'An error occured while executing the command.',
	OWNER_ONLY: 'This command is only available to the owner of the bot.',
	NO_DM: 'I can\'t execute that command inside DMs!',
	NO_PERMS: 'You don\'t have the permissions to use this command.',
	ARGS_MISSING: 'You didn\'t provide any arguments, %author%!',
	COMMAND_USAGE: 'The proper usage would be: `%prefix%%command% %usage%`',
	COMMAND_COOLDOWN: 'Please wait %time% more seconds before using the `%command%` command again.',

	// SERVER ---------------------------------------------

	// SERVER INIT
	SERVER_IS_ALREADY_INIT: 'This server is already initialized.',
	SERVER_IS_INIT: 'The server has been initialized.',
	SERVER_IS_NOT_INIT: 'The server is not initialized, use the "/setup" command to initialize it.',

	// SERVER SHOW CONFIGURATION
	SERVER_TITLE_CONFIGURATION: 'Server Configuration',
	SERVER_FIELD_GUILD_NAME: 'Server Name',
	SERVER_FIELD_GUILD_ID: 'Server ID',
	SERVER_FIELD_GUILD_LANG: 'Server Language',
	SERVER_FIELD_GUILD_CAMP: 'Server Camp',

	// SERVER SETUP
	SERVER_SET_LANG_REPLY: 'The server language has been changed to **%lang%**.',
	SERVER_SET_CAMP_REPLY: 'The server camp has been changed to **%camp%**.',

	// OPERATION ---------------------------------------------
	OPERATION_CREATOR: 'Creator',

	// OPERATION CREATE
	OPERATION_CREATE_TITLE: 'Operation %title%',
	OPERATION_CREATE_LABEL_DATE: 'Operation Date (dd/mm/yyyy)',
	OPERATION_CREATE_LABEL_TIME: 'Operation Time (hh:mm)',
	OPERATION_CREATE_LABEL_DURATION: 'Operation Duration (in minutes)',
	OPERATION_CREATE_LABEL_DESCRIPTION: 'Operation Description',

	// OPERATION GROUP
	OPERATION_NOT_EXIST: 'This operation does not exist.',
	OPERATION_NOT_HAVE_GROUPS: 'This operation has no groups.',

	// OPERATION BUTTONS


	// OPERATION SUCCESS
	OPERATION_CREATE_SUCCESS: 'Operation %title% has been created.',
	OPERATION_LAUNCH_SUCCESS: 'Operation %title% has been launched',
	OPERATION_FINISHED_SUCCESS: 'Operation %title% finished!',
	OPERATION_CANCELED_SUCCESS: 'Operation %title% canceled!',

	// OPERATION ERRORS
	OPERATION_TITLE_FORMAT_ERROR: 'The title must be alphanumeric without special characters.',
	OPERATION_CREATE_ERROR: 'An error occurred while creating the operation.',
	OPERATION_DATE_FORMAT_ERROR: 'The date format is incorrect.',
	OPERATION_TIME_FORMAT_ERROR: 'The time format is incorrect.',
	OPERATION_DURATION_FORMAT_ERROR: 'The duration format is incorrect.',
	OPERATION_DESCRIPTION_FORMAT_ERROR: 'The description format is incorrect.',
	OPERATION_LAUNCH_ERROR: 'An error occurred while launching the operation.',
	OPERATION_FINISHED_ERROR: 'An error occurred while finishing the operation.',
	OPERATION_CANCELED_ERROR: 'An error occurred while canceling the operation.',
	OPERATION_ARE_NO_OWNER_ERROR: 'You are not the owner of this operation.',

	// GROUP ---------------------------------------------
	GROUP_NOT_EXIST: 'This group does not exist.',
	THREAD_NOT_EXIST: 'This thread does not exist.',
	THREAD_CLOSED_OR_ARCHIVED: 'This thread is closed or archived.',
	GROUPS_OF_OPERATION: 'Operation Groups %title%',

	GROUP_TITLE: 'Logistics #%size% for operation %title%',

	// GROUP SUCCESS
	GROUP_CREATE_SUCCESS: 'Logistics thread created!',

	// GROUP ERRORS
	GROUP_CREATE_ERROR: 'An error occurred while implementing the logistics!',
	THREAD_CLOSE_ERROR: 'An error occurred while closing the thread!',
	THREAD_ARE_NO_OWNER_ERROR: 'You are not the owner of this thread!',
	GROUP_NO_MATERIALS: 'There are no materials in this group.',

	// LOGISTIC ---------------------------------------------

	LOGISTIC_LIST_COMMANDS: 'List of logistic commands',

	// MATERIAL ---------------------------------------------

	MATERIAL: 'Material',
	MATERIAL_NOT_EXIST: 'This material does not exist.',
	MATERIAL_DETAIL: 'Material Details',
	MATERIAL_ADD: 'Add Material',
	MATERIAL_REMOVE: 'Remove Material',
	MATERIAL_SELECT_QUANTITY: 'Select Quantity',
	MATERIAL_CONFIRMATION: 'Confirm Material',
	MATERIAL_REVOKE: 'Revoke Material',
	MATERIAL_ENTER_ID: 'Message ID or message link',

	MATERIAL_NOMBER: 'Number of Materials',
	MATERIAL_VALIDATE: 'Validated Materials',
	MATERIAL_INVALIDATE: 'Invalidated Materials',
	MATERIAL_QUANTITY_ASK: 'Requested Quantity',
	MATERIAL_QUANTITY_GIVEN: 'Submitted Quantity',
	MATERIAL_CREATOR: 'Creator',
	MATERIAL_PERSON_IN_CHARGE: 'Responsible',
	MATERIAL_LIST_OF_GROUP: 'List of Group Materials',
	MATERIAL_LOCALIZATION: 'Storage Location',
	MATERIAL_PRIORITY: 'Priority',
	MATERIAL_PRIORITY_LOW: 'Low',
	MATERIAL_PRIORITY_NEUTRAL: 'Neutral',
	MATERIAL_PRIORITY_HIGH: 'High',
	MATERIAL_HAVE_NO_NAME_OR_QUANTITY: 'Material must have a name and quantity.',
	MATERIAL_SELECT_TYPE: 'Select a material type to add',
	MATERIAL_SMALL_ARMS: 'Small Arms',
	MATERIAL_HEAVY_ARMS: 'Heavy Arms',
	MATERIAL_UTILITIES: 'Utilities',
	MATERIAL_SHIPABLES: 'Shipable Items',
	MATERIAL_VEHICLES: 'Vehicles',
	MATERIAL_UNIFORMS: 'Uniforms',
	MATERIAL_RESOURCES: 'Resources',
	MATERIAL_MEDICAL: 'Medical',

	// New categories
	CATEGORY_UTILITIES: 'Utilities',
	CATEGORY_INFANTRY_WEAPONS: 'Infantry Weapons',
	CATEGORY_AMMUNITION: 'Ammunition',
	CATEGORY_RESOURCES: 'Resources',
	CATEGORY_VEHICLES: 'Vehicles',

	// Utilities subcategories
	SUBCATEGORY_TOOLS: 'Tools',
	SUBCATEGORY_FIELD_EQUIPMENT: 'Field Equipment',
	SUBCATEGORY_MOUNTED_EQUIPMENT: 'Mounted Equipment',
	SUBCATEGORY_MEDICAL: 'Medical',
	SUBCATEGORY_UNIFORMS: 'Uniforms',
	SUBCATEGORY_OUTFITS: 'Outfits',

	// Infantry Weapons subcategories
	SUBCATEGORY_SMALL_ARMS: 'Small Arms',
	SUBCATEGORY_MELEE_WEAPONS: 'Melee Weapons',
	SUBCATEGORY_MACHINE_GUNS: 'Machine Guns',
	SUBCATEGORY_HEAVY_ARMS: 'Heavy Arms',
	SUBCATEGORY_GRENADES: 'Grenades',
	SUBCATEGORY_LAUNCHERS: 'Launchers',
	SUBCATEGORY_MORTAR: 'Mortar',

	// Ammunition subcategories
	SUBCATEGORY_LIGHT_AMMO: 'Light Ammunition',
	SUBCATEGORY_TANK_AMMO: 'Tank Ammunition',
	SUBCATEGORY_AIRCRAFT_AMMO: 'Aircraft Ammunition',
	SUBCATEGORY_ARTILLERY_AMMO: 'Artillery Ammunition',
	SUBCATEGORY_MISC_AMMO: 'Misc Ammunition',
	SUBCATEGORY_FLAMETHROWER_AMMO: 'Flamethrower Ammunition',

	// Resources subcategories
	SUBCATEGORY_BMAT: 'Basic Materials',
	SUBCATEGORY_EMAT: 'Explosive Materials',
	SUBCATEGORY_HEMAT: 'Heavy Explosive Materials',
	SUBCATEGORY_RMAT: 'Refined Materials',
	SUBCATEGORY_GRAVEL: 'Gravel',

	// Vehicles subcategories
	SUBCATEGORY_VEHICLES: 'Vehicles',

	MATERIAL_LIST_SMALL_ARMS: 'List of available small arms',
	MATERIAL_LIST_HEAVY_ARMS: 'List of available heavy arms',
	MATERIAL_LIST_UTILITIES: 'List of available utilities',
	MATERIAL_LIST_SHIPABLES: 'List of available shipable items',
	MATERIAL_LIST_VEHICLES: 'List of available vehicles',
	MATERIAL_LIST_UNIFORMS: 'List of available uniforms',
	MATERIAL_LIST_RESOURCES: 'List of available resources',
	MATERIAL_SUBCATEGORY_EMPTY: 'No materials available in this category.',

	// MATERIAL SUCCESS
	MATERIAL_CREATE_SUCCESS: 'Material has been created.',
	MATERIAL_DELETE_SUCCESS: 'Material has been deleted.',

	// MATERIAL ERRORS
	MATERIAL_CREATE_ERROR: 'An error occurred while creating the material.',
	MATERIAL_UPDATE_ERROR: 'An error occurred while updating the material.',
	MATERIAL_DELETE_ERROR: 'An error occurred while deleting the material.',
	MATERIAL_SELECT_ERROR: 'An error occurred while selecting the material.',
	MATERIAL_VALIDATE_ERROR: 'An error occurred while validating the material.',
	MATERIAL_CONFIRM_ERROR: 'An error occurred while confirming the material.',
	MATERIAL_ASSIGN_ERROR: 'An error occurred while assigning the material.',
	MATERIAL_ARE_NO_CREATOR_ERROR: 'You are not the creator of this material.',
	MATERIAL_CANNOT_MANAGE_ERROR: 'You cannot modify this material (creator or server/channel manager only).',
	MATERIAL_ARE_NO_OWNER_ERROR: 'You are not the owner of this material.',
	MATERIAL_QUANTITY_ERROR: 'The quantity must be a positive number.',
	MATERIAL_SELECT_QUANTITY_ERROR: 'An error occurred while selecting the quantity.',
	MATERIAL_LOCALIZATION_ERROR: 'The localization format is incorrect.',
	MATERIAL_BACK_ERROR: 'An error occurred while returning to the previous menu.',

	// STOCKPILE ---------------------------------------------

	STOCKPILE: 'Stockpile',
	STOCKPILE_LIST_COMMANDS: 'List of stock commands',
	STOCKPILE_LIST: 'List of stocks',
	STOCKPILE_LIST_CODES: 'List of stockpile codes',
	STOCKPILE_TABLE_HEADER_STOCK: 'Stockpile',
	STOCKPILE_TABLE_HEADER_CODE: 'Code',
	STOCKPILE_TABLE_HEADER_EXPIRES: 'Date',
	STOCKPILE_REGION: 'Region',
	STOCKPILE_CITY: 'City',
	STOCKPILE_PLACEHOLDER_REGION: 'Letters, numbers, spaces, hyphens (2-50)',
	STOCKPILE_PLACEHOLDER_CITY: 'City name (2-50)',
	STOCKPILE_PLACEHOLDER_NAME: '3-50 characters, alphanumeric',
	STOCKPILE_PLACEHOLDER_CODE: '6 digits, e.g. 123456',

	STOCKPILE_TIME_REMAINING: 'Time remaining',
	STOCKPILE_CREATOR: 'Creator',

	// STOCKPILE SUCCESS
	STOCKPILE_CREATE_SUCCESS: 'The stock has been created.',
	STOCKPILE_DELETE_SUCCESS: 'The stock has been deleted.',
	STOCKPILE_MARK_DELETED_SUCCESS: 'The stock has been marked as deleted.',
	STOCKPILE_RESET_SUCCESS: 'The stock timer has been reset to 2 days.',
	STOCKPILE_CLEANUP_SUCCESS: '%count% marked stock(s) deleted in this channel.',
	STOCKPILE_RESET_ALL_SUCCESS: 'All stockpiles have been deleted.',

	// STOCKPILE ERRORS
	STOCKPILE_LIST_EMPTY: 'There are no stocks.',
	STOCKPILE_NOT_EXIST: 'This stock does not exist.',
	STOCKPILE_INVALID_ID: 'The stock ID is invalid.',
	STOCKPILE_CREATE_ERROR: 'An error occurred while creating the stock.',
	STOCKPILE_DELETE_ERROR: 'An error occurred while deleting the stock.',
	STOCKPILE_INVALID_NAME: 'The stock name is invalid.',
	STOCKPILE_INVALID_PASSWORD: 'The code must be exactly 6 digits.',
	STOCKPILE_INVALID_REGION: 'The region is invalid.',
	STOCKPILE_INVALID_CITY: 'The city is invalid.',
	STOCKPILE_ALREADY_DELETED: 'This stock is already marked as deleted.',
	STOCKPILE_ARE_NO_OWNER_ERROR: 'You are not the creator of this stockpile.',
	STOCKPILE_NOT_DELETED: 'This stock is not marked as deleted.',
	STOCKPILE_RESTORE_SUCCESS: 'The stockpile has been restored.',

	// NOTIFICATIONS
	NOTIFICATION_TYPE_STOCKPILE_ACTIVITY: 'Stockpile activity',
	NOTIFICATION_NO_PERMS: 'You need the "Manage Channels" permission to subscribe or unsubscribe.',
	NOTIFICATION_SUBSCRIBE_SUCCESS: 'This channel is now subscribed to the selected notification type.',
	NOTIFICATION_UNSUBSCRIBE_SUCCESS: 'This channel is no longer subscribed.',
	NOTIFICATION_ALREADY_SUBSCRIBED: 'This channel is already subscribed to this notification type.',
	NOTIFICATION_NOT_SUBSCRIBED: 'This channel is not subscribed to this notification type.',
	NOTIFICATION_LIST_EMPTY: 'No channels are subscribed to notifications on this server.',
	NOTIFICATION_LIST_HEADER: '**Notification subscriptions**',
	NOTIFICATION_STOCKPILE_ADDED: '📦 %user% added stockpile **%name%** (#%id%) in %region% / %city%.',
	NOTIFICATION_STOCKPILE_REMOVED: '🗑️ %user% marked stockpile **%name%** (#%id%) as deleted.',
	NOTIFICATION_STOCKPILE_RESTORED: '♻️ %user% restored stockpile **%name%** (#%id%).',
	NOTIFICATION_STOCKPILE_RESET: '🔄 %user% reset the timer for stockpile **%name%** (#%id%).',
	NOTIFICATION_TYPE_STOCKPILE_EXPIRING: 'Stockpile expiring soon',
	NOTIFICATION_STOCKPILE_EXPIRING_ALERT: '⏰ **Stockpile reminder**',
	NOTIFICATION_STOCKPILE_EXPIRING_LINE: '• %creator%#%id% **%name%** — %region% / %city% — %window%',
	NOTIFICATION_EXPIRING_IN_12H: 'in 12h',
	NOTIFICATION_EXPIRING_IN_6H: 'in 6h',
	NOTIFICATION_EXPIRING_IN_3H: 'in 3h',
	NOTIFICATION_EXPIRING_IN_2H: 'in 2h',
	NOTIFICATION_EXPIRING_IN_1H: 'in 1h',
	NOTIFICATION_EXPIRING_IN_30M: 'in 30min',
};

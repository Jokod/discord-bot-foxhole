module.exports = {
	name: 'English',
	code: 'en',

	// DEFAULT
	COMMAND_UNKNOWN: 'This command does not exist.',
	NONE: 'None',
	ID: 'ID',
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
	LOGISTICS: 'Logistics',
	ASSIGNEE: 'Assignee',
	REVOKE: 'Revoke',
	BACK: 'Back',
	INTERACTION_ERROR: 'No interaction was found for this action.',
	PREFIX_MESSAGE: 'Hi %author%! My prefix is %prefix%, for help %prefix%help',
	STATUS: 'Status',

	// COMMANDS

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
	OPERATION_LAUNCH_SUCCESS: 'Operation %title% has been launched! @everyone.',
	OPERATION_FINISHED_SUCCESS: 'Operation %title% finished!',
	OPERATION_CANCELED_SUCCESS: 'Operation %title% canceled!',

	// OPERATION ERRORS
	OPERATION_DATE_FORMAT_ERROR: 'The date format is incorrect.',
	OPERATION_TIME_FORMAT_ERROR: 'The time format is incorrect.',
	OPERATION_MATERIALS_NOT_ALL_VALIDATE: 'Not all materials have been validated!\nUnable to launch the operation!\nPlease validate or remove the unvalidated materials.',
	OPERATION_LAUNCH_ERROR: 'An error occurred while launching the operation.',
	OPERATION_FINISHED_ERROR: 'An error occurred while finishing the operation.',
	OPERATION_CANCELED_ERROR: 'An error occurred while canceling the operation.',
	OPERATION_ARE_NO_OWNER_ERROR: 'You are not the owner of this operation.',

	// GROUP ---------------------------------------------
	GROUP_NOT_EXIST: 'This group does not exist.',
	THREAD_NOT_EXIST: 'This thread does not exist.',
	GROUPS_OF_OPERATION: 'Operation Groups %title%',

	GROUP_TITLE: 'Logistics #%size% for operation %title%',

	// GROUP SUCCESS
	GROUP_CREATE_SUCCESS: 'Logistics thread created!',

	// GROUP ERRORS
	GROUP_CREATE_ERROR: 'An error occurred while implementing the logistics!',
	THREAD_CLOSE_ERROR: 'An error occurred while closing the thread!',
	THREAD_ARE_NO_OWNER_ERROR: 'You are not the owner of this thread!',

	// LOGISTIC ---------------------------------------------

	LOGISTIC_LIST_COMMANDS: 'List of logistic commands',
	LOGISTIC_SEE_MATERIALS_NOT_VALIDATE: 'You can use the "/logistics" command to see unvalidated materials.',

	// MATERIAL ---------------------------------------------

	MATERIAL: 'Material',
	MATERIAL_NOT_EXIST: 'This material does not exist.',
	MATERIAL_DETAIL: 'Material Details',
	MATERIAL_ADD: 'Add Material',
	MATERIAL_REMOVE: 'Remove Material',
	MATERIAL_SELECT_QUANTITY: 'Select Quantity',
	MATERIAL_CONFIRMATION: 'Confirm Material',
	MATERIAL_REVOKE: 'Revoke Material',
	MATERIAL_ENTER_ID: 'Enter Material ID',

	MATERIAL_NOMBER: 'Number of Materials',
	MATERIAL_VALIDATE: 'Validated Materials',
	MATERIAL_INVALIDATE: 'Invalidated Materials',
	MATERIAL_QUANTITY_ASK: 'Requested Quantity',
	MATERIAL_QUANTITY_GIVEN: 'Submitted Quantity',
	MATERIAL_CREATOR: 'Creator',
	MATERIAL_PERSON_IN_CHARGE: 'Responsible',
	MATERIAL_LIST_OF_GROUP: 'List of Group Materials',
	MATERIAL_LOCALIZATION: 'Storage Location',
	MATERIAL_HAVE_NO_NAME_OR_QUANTITY: 'Material must have a name and quantity.',
	MATERIAL_SELECT_TYPE: 'Select a material type to add',
	MATERIAL_SMALL_ARMS: 'Small Arms',
	MATERIAL_HEAVY_ARMS: 'Heavy Arms',
	MATERIAL_UTILITIES: 'Utilities',
	MATERIAL_SHIPABLES: 'Shipable Items',
	MATERIAL_VEHICLES: 'Vehicles',
	MATERIAL_UNIFORMS: 'Uniforms',

	MATERIAL_LIST_SMALL_ARMS: 'List of available small arms',
	MATERIAL_LIST_HEAVY_ARMS: 'List of available heavy arms',
	MATERIAL_LIST_UTILITIES: 'List of available utilities',
	MATERIAL_LIST_SHIPABLES: 'List of available shipable items',
	MATERIAL_LIST_VEHICLE: 'List of available vehicles',
	MATERIAL_LIST_UNIFORMS: 'List of available uniforms',

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
	MATERIAL_NOT_BELONG_OPERATION: 'This material does not belong to this operation.',
	MATERIAL_ARE_NO_CREATOR_ERROR: 'You are not the creator of this material.',
	MATERIAL_ARE_NO_OWNER_ERROR: 'You are not the owner of this material.',
	MATERIAL_QUANTITY_ERROR: 'The quantity must be a positive number.',
	MATERIAL_SELECT_QUANTITY_ERROR: 'An error occurred while selecting the quantity.',
	MATERIAL_LOCALIZATION_ERROR: 'The localization cannot be empty.',
	MATERIAL_BACK_ERROR: 'An error occurred while returning to the previous menu.',
};

module.exports = {
	name: 'Français',
	code: 'fr',

	// DEFAULT
	COMMAND_UNKNOWN: 'Cette commande n\'existe pas.',
	NONE: 'Aucun',
	ID: 'ID',
	QUANTITY: 'Quantité',
	DELETE: 'Supprimer',
	DATE: 'Date',
	HOURS: 'Heure',
	DURATION: 'Durée',
	DESCRIPTION: 'Description',
	START: 'Démarrer',
	CANCEL: 'Annuler',
	FINISHED: 'Terminer',
	VALIDATE: 'Valider',
	VALIDATED: 'Validé',
	PENDING: 'En attente',
	CONFIRM: 'Confirmer',
	LOGISTICS: 'Logistique',
	ASSIGNEE: 'Assigné',
	REVOKE: 'Se rétracter',
	BACK: 'Retour',
	INTERACTION_ERROR: 'Aucune intéraction n\'a été trouvée pour cette action.',
	PREFIX_MESSAGE: 'Salut %author%! Mon prefix est %prefix%, pour avoir de l\'aide %prefix%help',
	STATUS: 'Statut',

	// COMMANDS

	COMMAND_EXECUTE_ERROR: 'Une erreur est survenue lors de l\'exécution de la commande.',
	OWNER_ONLY: 'Cette commande est uniquement disponible pour le propriétaire du bot.',
	NO_DM: 'Je ne peux pas exécuter cette commande dans les DMs !',
	NO_PERMS: 'You don\'t have the permissions to use this command.',
	ARGS_MISSING: 'You didn\'t provide any arguments, %author%!',
	COMMAND_USAGE: 'L\'utilisation correcte serait: `%prefix%%command% %usage%`',
	COMMAND_COOLDOWN: 'Please wait %time% more seconds before using the `%command%` command again.',

	// SERVER ---------------------------------------------

	// SERVER INIT
	SERVER_IS_ALREADY_INIT: 'Ce serveur est déjà initialisé.',
	SERVER_IS_INIT: 'Le serveur a été initialisé.',
	SERVER_IS_NOT_INIT: 'Le serveur n\'est pas initialisé, utilisez la commande "/setup" pour l\'initialiser.',

	// SERVER SHOW CONFIGURATION
	SERVER_TITLE_CONFIGURATION: 'Configuration du serveur',
	SERVER_FIELD_GUILD_NAME: 'Nom du serveur',
	SERVER_FIELD_GUILD_ID: 'ID du serveur',
	SERVER_FIELD_GUILD_LANG: 'Langue du serveur',
	SERVER_FIELD_GUILD_CAMP: 'Camp du serveur',

	// SERVER SETUP
	SERVER_SET_LANG_REPLY: 'La langue du serveur a été changée en **%lang%**.',
	SERVER_SET_CAMP_REPLY: 'Le camp du serveur a été changé en **%camp%**.',

	// OPERATION ---------------------------------------------
	OPERATION_CREATOR: 'Créateur',

	// OPERATION CREATE
	OPERATION_CREATE_TITLE: 'Opération %title%',
	OPERATION_CREATE_LABEL_DATE: 'Date de l\'opération (jj/mm/aaaa)',
	OPERATION_CREATE_LABEL_TIME: 'Heure de l\'opération (hh:mm)',
	OPERATION_CREATE_LABEL_DURATION: 'Durée de l\'opération (en minutes)',
	OPERATION_CREATE_LABEL_DESCRIPTION: 'Description de l\'opération',

	// OPERATION GROUP
	OPERATION_NOT_EXIST: 'Cette opération n\'existe pas.',
	OPERATION_NOT_HAVE_GROUPS: 'Cette opération n\'a pas de groupes.',

	// OPERATION BUTTONS


	// OPERATION SUCCESS
	OPERATION_CREATE_SUCCESS: 'L\'opération %title% a été créée.',
	OPERATION_LAUNCH_SUCCESS: 'L\'opération %title% a été lancée ! @everyone.',
	OPERATION_FINISHED_SUCCESS: 'L\'opération %title% terminée !',
	OPERATION_CANCELED_SUCCESS: 'L\'opération %title% annulée !',

	// OPERATION ERRORS
	OPERATION_DATE_FORMAT_ERROR: 'Le format de la date est incorrect.',
	OPERATION_TIME_FORMAT_ERROR: 'Le format de l\'heure est incorrect.',
	OPERATION_MATERIALS_NOT_ALL_VALIDATE: 'Tous les matériaux n\'ont pas été validés !\nImpossible de lancer l\'opération !\nVeuillez valider ou supprimer les matériaux non validés.',
	OPERATION_LAUNCH_ERROR: 'Une erreur est survenue lors du lancement de l\'opération.',
	OPERATION_FINISHED_ERROR: 'Une erreur est survenue lors de la fin de l\'opération.',
	OPERATION_CANCELED_ERROR: 'Une erreur est survenue lors de l\'annulation de l\'opération.',
	OPERATION_ARE_NO_OWNER_ERROR: 'Vous n\'êtes pas le propriétaire de cette opération.',

	// GROUP ---------------------------------------------
	GROUP_NOT_EXIST: 'Ce groupe n\'existe pas.',
	THREAD_NOT_EXIST: 'Ce thread n\'existe pas.',
	GROUPS_OF_OPERATION: 'Groupes de l\'opération %title%',

	GROUP_TITLE: 'Logistique #%size% pour l\'opération %title%',

	// GROUP SUCCESS
	GROUP_CREATE_SUCCESS: 'Thread de logistique créé !',

	// GROUP ERRORS
	GROUP_CREATE_ERROR: 'Une erreur s\'est produite lors de l\'implémentation de la logistique !',
	THREAD_CLOSE_ERROR: 'Une erreur s\'est produite lors de la fermeture du thread !',
	THREAD_ARE_NO_OWNER_ERROR: 'Vous n\'êtes pas le propriétaire de ce thread !',

	// LOGISTIC ---------------------------------------------

	LOGISTIC_LIST_COMMANDS: 'Liste des commandes logistiques',
	LOGISTIC_SEE_MATERIALS_NOT_VALIDATE: 'Vous pouvez utiliser la commande "/logistics" pour voir les matériels non validés.',

	// MATERIAL ---------------------------------------------

	MATERIAL: 'Matériel',
	MATERIAL_NOT_EXIST: 'Ce matériel n\'existe pas.',
	MATERIAL_DETAIL: 'Détails du matériel',
	MATERIAL_ADD: 'Ajouter un matériel',
	MATERIAL_REMOVE: 'Retirer un matériel',
	MATERIAL_SELECT_QUANTITY: 'Sélectionnez la quantité',
	MATERIAL_CONFIRMATION: 'Confirmer le matériel',
	MATERIAL_REVOKE: 'Révoquer le matériel',
	MATERIAL_ENTER_ID: 'Entrez l\'ID du matériel',

	MATERIAL_NOMBER: 'Nombre de matériaux',
	MATERIAL_VALIDATE: 'Matériaux validés',
	MATERIAL_INVALIDATE: 'Matériaux invalidés',
	MATERIAL_QUANTITY_ASK: 'Quantité demandée',
	MATERIAL_QUANTITY_GIVEN: 'Quantité soumise',
	MATERIAL_CREATOR: 'Créateur',
	MATERIAL_PERSON_IN_CHARGE: 'Responsable',
	MATERIAL_LIST_OF_GROUP: 'Liste des matériaux du groupe',
	MATERIAL_LOCALIZATION: 'Lieu de stockage',
	MATERIAL_HAVE_NO_NAME_OR_QUANTITY: 'Le matériel doit avoir un nom et une quantité.',
	MATERIAL_SELECT_TYPE: 'Sélectionnez un type de matériel à ajouter',
	MATERIAL_SMALL_ARMS: 'Armes légères',
	MATERIAL_HEAVY_ARMS: 'Armes lourdes',
	MATERIAL_UTILITIES: 'Utilitaires',
	MATERIAL_SHIPABLES: 'Objets transportables',
	MATERIAL_VEHICLES: 'Véhicules',
	MATERIAL_UNIFORMS: 'Uniformes',

	MATERIAL_LIST_SMALL_ARMS: 'Liste des armes légères disponibles',
	MATERIAL_LIST_HEAVY_ARMS: 'Liste des armes lourdes disponibles',
	MATERIAL_LIST_UTILITIES: 'Liste des utilitaires disponibles',
	MATERIAL_LIST_SHIPABLES: 'Liste des objets transportables disponibles',
	MATERIAL_LIST_VEHICLE: 'Liste des véhicules disponibles',
	MATERIAL_LIST_UNIFORMS: 'Liste des uniformes disponibles',

	// MATERIAL SUCCESS
	MATERIAL_CREATE_SUCCESS: 'Le matériel a été créé.',
	MATERIAL_DELETE_SUCCESS: 'Le matériel a été supprimé.',

	// MATERIAL ERRORS
	MATERIAL_CREATE_ERROR: 'Une erreur est survenue lors de la création du matériel.',
	MATERIAL_UPDATE_ERROR: 'Une erreur est survenue lors de la mise à jour du matériel.',
	MATERIAL_DELETE_ERROR: 'Une erreur est survenue lors de la suppression du matériel.',
	MATERIAL_SELECT_ERROR: 'Une erreur est survenue lors de la sélection du matériel.',
	MATERIAL_VALIDATE_ERROR: 'Une erreur est survenue lors de la validation du matériel.',
	MATERIAL_CONFIRM_ERROR: 'Une erreur est survenue lors de la confirmation du matériel.',
	MATERIAL_ASSIGN_ERROR: 'Une erreur est survenue lors de l\'assignation du matériel.',
	MATERIAL_NOT_BELONG_OPERATION: 'Ce matériel n\'appartient pas à cette opération.',
	MATERIAL_ARE_NO_CREATOR_ERROR: 'Vous n\'êtes pas le créateur de ce matériel.',
	MATERIAL_ARE_NO_OWNER_ERROR: 'Vous n\'êtes pas le propriétaire de ce matériel.',
	MATERIAL_QUANTITY_ERROR: 'La quantité doit être un nombre positif.',
	MATERIAL_SELECT_QUANTITY_ERROR: 'Une erreur est survenue lors de la sélection de la quantité.',
	MATERIAL_LOCALIZATION_ERROR: 'La localisation ne peut pas être vide.',
	MATERIAL_BACK_ERROR: 'Une erreur est survenue lors du retour au menu précédent.',
};
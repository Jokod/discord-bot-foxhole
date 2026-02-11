module.exports = {
	name: 'Français',
	code: 'fr',

	// DEFAULT
	COMMAND_UNKNOWN: 'Cette commande n\'existe pas.',
	NONE: 'Aucun',
	NAME: 'Nom',
	PASSWORD: 'Mot de passe',
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

	// GITHUB
	GITHUB_REPLY: 'Lien du dépôt : %url%',
	GITHUB_MESSAGE: 'Vous pouvez suivre les évolutions et participer à l\'amélioration de l\'outil en proposant des pull requests : tenir à jour le matériel pour les factions, proposer des commandes ou signaler des problèmes (issues).',
	GITHUB_NOT_CONFIGURED: 'Le lien GitHub n\'est pas configuré.',

	// FOXHOLE
	FOXHOLE_TITLE: 'Foxhole – Joueurs & Guerre',
	FOXHOLE_PLAYERS_CURRENT: 'Joueurs en ligne',
	FOXHOLE_WAR_TITLE: 'Guerre en cours',
	FOXHOLE_WAR_NUMBER: 'Guerre #',
	FOXHOLE_WAR_WINNER: 'Vainqueur',
	FOXHOLE_WAR_REQUIRED_TOWNS: 'Villes pour victoire',
	FOXHOLE_WAR_START: 'Début de la conquête',
	FOXHOLE_WINNER_NONE: 'En cours',
	FOXHOLE_WINNER_WARDEN: 'Warden',
	FOXHOLE_WINNER_COLONIAL: 'Colonial',
	FOXHOLE_UNAVAILABLE: 'Données indisponibles',
	FOXHOLE_ALL_UNAVAILABLE: 'Les services externes (Steam, Foxhole) ne répondent pas. Réessayez plus tard.',

	HELP_NO_SUBCOMMANDS: 'Cette commande n\'a pas de sous-commandes.',
	HELP_NO_PARAMS: 'Cette commande n\'a pas de paramètres.',

	HELP_TITLE_LIST: 'Liste des commandes',
	HELP_TITLE_COMMAND: 'Aide pour la commande `%command%`',

	HELP_SECTION_SUBCOMMANDS: 'Sous-commandes',
	HELP_SECTION_PARAMETERS: 'Paramètres',
	HELP_COMMAND_NOT_FOUND: 'La commande `%command%` n\'existe pas !',
	HELP_PARAM_REQUIRED_SUFFIX: ' (obligatoire)',

	COMMAND_EXECUTE_ERROR: 'Une erreur est survenue lors de l\'exécution de la commande.',
	OWNER_ONLY: 'Cette commande est uniquement disponible pour le propriétaire du bot.',
	NO_DM: 'Je ne peux pas exécuter cette commande dans les DMs !',
	NO_PERMS: 'Vous n\'avez pas les permissions pour utiliser cette commande.',
	ARGS_MISSING: 'Vous n\'avez fourni aucun argument, %author% !',
	COMMAND_USAGE: 'L\'utilisation correcte serait: `%prefix%%command% %usage%`',
	COMMAND_COOLDOWN: 'Veuillez attendre %time% secondes avant de réutiliser la commande `%command%`.',

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
	OPERATION_LAUNCH_SUCCESS: 'L\'opération %title% a été lancée !',
	OPERATION_FINISHED_SUCCESS: 'L\'opération %title% terminée !',
	OPERATION_CANCELED_SUCCESS: 'L\'opération %title% annulée !',

	// OPERATION ERRORS
	OPERATION_TITLE_FORMAT_ERROR: 'Le titre doit être alphanumérique sans caractères spéciaux.',
	OPERATION_CREATE_ERROR: 'Une erreur est survenue lors de la création de l\'opération.',
	OPERATION_DATE_FORMAT_ERROR: 'Le format de la date est incorrect.',
	OPERATION_TIME_FORMAT_ERROR: 'Le format de l\'heure est incorrect.',
	OPERATION_DURATION_FORMAT_ERROR: 'Le format de la durée est incorrect.',
	OPERATION_DESCRIPTION_FORMAT_ERROR: 'Le format de la description est incorrect.',
	OPERATION_LAUNCH_ERROR: 'Une erreur est survenue lors du lancement de l\'opération.',
	OPERATION_FINISHED_ERROR: 'Une erreur est survenue lors de la fin de l\'opération.',
	OPERATION_CANCELED_ERROR: 'Une erreur est survenue lors de l\'annulation de l\'opération.',
	OPERATION_ARE_NO_OWNER_ERROR: 'Vous n\'êtes pas le propriétaire de cette opération.',

	// GROUP ---------------------------------------------
	GROUP_NOT_EXIST: 'Ce groupe n\'existe pas.',
	THREAD_NOT_EXIST: 'Ce thread n\'existe pas.',
	THREAD_CLOSED_OR_ARCHIVED: 'Ce thread est fermé ou archivé.',
	GROUPS_OF_OPERATION: 'Groupes de l\'opération %title%',

	GROUP_TITLE: 'Logistique #%size% pour l\'opération %title%',

	// GROUP SUCCESS
	GROUP_CREATE_SUCCESS: 'Thread de logistique créé !',

	// GROUP ERRORS
	GROUP_CREATE_ERROR: 'Une erreur s\'est produite lors de l\'implémentation de la logistique !',
	THREAD_CLOSE_ERROR: 'Une erreur s\'est produite lors de la fermeture du thread !',
	THREAD_ARE_NO_OWNER_ERROR: 'Vous n\'êtes pas le propriétaire de ce thread !',
	GROUP_NO_MATERIALS: 'Il n\'y a pas de matériel dans ce groupe.',

	// LOGISTIC ---------------------------------------------

	LOGISTIC_LIST_COMMANDS: 'Liste des commandes logistiques',

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
	MATERIAL_RESOURCES: 'Ressources',
	MATERIAL_MEDICAL: 'Médical',

	// Nouvelles catégories
	CATEGORY_UTILITIES: 'Utilitaires',
	CATEGORY_INFANTRY_WEAPONS: 'Armes d\'infanterie',
	CATEGORY_AMMUNITION: 'Munition',
	CATEGORY_RESOURCES: 'Ressources',
	CATEGORY_VEHICLES: 'Véhicule',

	// Sous-catégories Utilitaires
	SUBCATEGORY_TOOLS: 'Outils',
	SUBCATEGORY_FIELD_EQUIPMENT: 'Matériel de terrain',
	SUBCATEGORY_MOUNTED_EQUIPMENT: 'Matériel monté',
	SUBCATEGORY_MEDICAL: 'Soins',
	SUBCATEGORY_UNIFORMS: 'Uniformes',
	SUBCATEGORY_OUTFITS: 'Tenues',

	// Sous-catégories Armes d'infanterie
	SUBCATEGORY_SMALL_ARMS: 'Armes légères',
	SUBCATEGORY_MELEE_WEAPONS: 'Armes de mêlée',
	SUBCATEGORY_MACHINE_GUNS: 'Mitrailleuses',
	SUBCATEGORY_HEAVY_ARMS: 'Armes lourdes diverses',
	SUBCATEGORY_GRENADES: 'Grenades',
	SUBCATEGORY_LAUNCHERS: 'Lanceurs',
	SUBCATEGORY_MORTAR: 'Mortier',

	// Sous-catégories Munition
	SUBCATEGORY_LIGHT_AMMO: 'Munitions légères',
	SUBCATEGORY_TANK_AMMO: 'Munitions tank',
	SUBCATEGORY_AIRCRAFT_AMMO: 'Munitions avions',
	SUBCATEGORY_ARTILLERY_AMMO: 'Munitions artillerie',
	SUBCATEGORY_MISC_AMMO: 'Munitions diverses',
	SUBCATEGORY_FLAMETHROWER_AMMO: 'Munitions lance flamme',

	// Sous-catégories Ressources
	SUBCATEGORY_BMAT: 'bmat',
	SUBCATEGORY_EMAT: 'emat',
	SUBCATEGORY_HEMAT: 'HEmat',
	SUBCATEGORY_RMAT: 'Rmat',
	SUBCATEGORY_GRAVEL: 'Gravel',

	// Sous-catégories Véhicules
	SUBCATEGORY_VEHICLES: 'Véhicules',

	MATERIAL_LIST_SMALL_ARMS: 'Liste des armes légères disponibles',
	MATERIAL_LIST_HEAVY_ARMS: 'Liste des armes lourdes disponibles',
	MATERIAL_LIST_UTILITIES: 'Liste des utilitaires disponibles',
	MATERIAL_LIST_SHIPABLES: 'Liste des objets transportables disponibles',
	MATERIAL_LIST_VEHICLES: 'Liste des véhicules disponibles',
	MATERIAL_LIST_UNIFORMS: 'Liste des uniformes disponibles',
	MATERIAL_LIST_RESOURCES: 'Liste des ressources disponibles',
	MATERIAL_SUBCATEGORY_EMPTY: 'Aucun matériel disponible dans cette catégorie.',

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
	MATERIAL_ARE_NO_CREATOR_ERROR: 'Vous n\'êtes pas le créateur de ce matériel.',
	MATERIAL_ARE_NO_OWNER_ERROR: 'Vous n\'êtes pas le propriétaire de ce matériel.',
	MATERIAL_QUANTITY_ERROR: 'La quantité doit être un nombre positif.',
	MATERIAL_SELECT_QUANTITY_ERROR: 'Une erreur est survenue lors de la sélection de la quantité.',
	MATERIAL_LOCALIZATION_ERROR: 'Le format de la localisation est incorrect.',
	MATERIAL_BACK_ERROR: 'Une erreur est survenue lors du retour au menu précédent.',

	// STOCKPILE ---------------------------------------------

	STOCKPILE: 'Stock',
	STOCKPILE_LIST_COMMANDS: 'Liste des commandes de stock',
	STOCKPILE_LIST: 'Liste des stocks',
	STOCKPILE_LIST_CODES: 'Liste des codes de stockpile',
	STOCKPILE_TABLE_HEADER_STOCK: 'Stockpile',
	STOCKPILE_TABLE_HEADER_CODE: 'Code',
	STOCKPILE_TABLE_HEADER_EXPIRES: 'Date',
	STOCKPILE_REGION: 'Région',
	STOCKPILE_CITY: 'Ville',
	STOCKPILE_PLACEHOLDER_REGION: 'Lettres, chiffres, espaces, tirets (2-50)',
	STOCKPILE_PLACEHOLDER_CITY: 'Nom de la ville (2-50)',
	STOCKPILE_PLACEHOLDER_NAME: '3-50 caractères, alphanumériques',
	STOCKPILE_PLACEHOLDER_CODE: '6 chiffres, ex: 123456',

	STOCKPILE_TIME_REMAINING: 'Temps restant',
	STOCKPILE_CREATOR: 'Créateur',

	// STOCKPILE SUCCESS
	STOCKPILE_CREATE_SUCCESS: 'Le stock a été créé.',
	STOCKPILE_DELETE_SUCCESS: 'Le stock a été supprimé.',
	STOCKPILE_MARK_DELETED_SUCCESS: 'Le stock a été marqué comme supprimé.',
	STOCKPILE_RESET_SUCCESS: 'Le délai du stock a été remis à 2 jours.',
	STOCKPILE_CLEANUP_SUCCESS: '%count% stock(s) marqué(s) supprimé(s) dans ce salon.',
	STOCKPILE_RESET_ALL_SUCCESS: 'Tous les stocks ont été supprimés.',

	// STOCKPILE ERRORS
	STOCKPILE_LIST_EMPTY: 'Il n\'y a pas de stocks.',
	STOCKPILE_NOT_EXIST: 'Ce stock n\'existe pas.',
	STOCKPILE_INVALID_ID: 'L\'ID du stock est invalide.',
	STOCKPILE_CREATE_ERROR: 'Une erreur est survenue lors de la création du stock.',
	STOCKPILE_DELETE_ERROR: 'Une erreur est survenue lors de la suppression du stock.',
	STOCKPILE_INVALID_NAME: 'Le nom du stock est invalide.',
	STOCKPILE_INVALID_PASSWORD: 'Le code doit contenir exactement 6 chiffres.',
	STOCKPILE_INVALID_REGION: 'La région du stock est invalide.',
	STOCKPILE_INVALID_CITY: 'La ville du stock est invalide.',
	STOCKPILE_ALREADY_DELETED: 'Ce stock est déjà marqué comme supprimé.',
	STOCKPILE_ARE_NO_OWNER_ERROR: 'Vous n\'êtes pas le créateur de ce stock.',
	STOCKPILE_NOT_DELETED: 'Ce stock n\'est pas marqué comme supprimé.',
	STOCKPILE_RESTORE_SUCCESS: 'Le stock a été réactivé.',
};
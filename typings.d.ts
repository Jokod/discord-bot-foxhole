import * as Discord from "discord.js";

/**
 * Represents an Application Command (Slash Command).
 */
export interface SlashInteractionCommand {
	/**
	 * The data of Application Command Interaction (Slash Command).
	 */
	init?: boolean;
	data: Discord.SlashCommandBuilder;
	options: Array<
		| Discord.SlashCommandStringOption
		| Discord.SlashCommandNumberOption
		| Discord.SlashCommandRoleOption
		| Discord.SlashCommandUserOption
		| Discord.SlashCommandBooleanOption
		| Discord.SlashCommandChannelOption
		| Discord.SlashCommandIntegerOption
	>;

	/**
	 * The interaction executor when it is called by the template handler.
	 * @param interaction The interaction that triggered this command.
	 */
	execute(
		interaction: Discord.ChatInputCommandInteraction & { client: Client }
	): void | Promise<void>;
}

/**
 * Represents a Button Interaction.
 */
export interface ButtonInteractionCommand {
	/**
	 * The custom ID of the button which was interacted with.
	 */
	init?: boolean;
	id: string;

	/**
	 * The interaction executor when it is called by the template handler.
	 * @param interaction The interaction that triggered this command.
	 */
	execute(
		interaction: Discord.ButtonInteraction & { client: Client }
	): void | Promise<void>;
}

/**
 * Represents a Select Interaction.
 */
export interface SelectInteractionCommand {
	/**
	 * The custom ID of the select (menu option) which was interacted with.
	 */
	init?: boolean;
	id: string;

	/**
	 * The interaction executor when it is called by the template handler.
	 * @param interaction The interaction that triggered this command.
	 */
	execute(
		interaction: Discord.StringSelectMenuInteraction & { client: Client }
	): void | Promise<void>;
}

/**
 * The data of Context Menu Interaction Command.
 */
export interface ContextInteractionCommandData {
	/**
	 * The name of the context (menu option) which was interacted with.
	 */
	init?: boolean;
	name: string;

	/**
	 * The type of the context (menu option) which was interacted with.
	 * 2: User Based Context Menu Option.
	 * 3: Message Based Context Menu Option.
	 */
	type: 2 | 3;
}

/**
 * Represents a Context Interaction.
 */
export interface ContextInteractionCommand {
	/**
	 * The data of Context Menu Interaction Command.
	 */
	init?: boolean;
	data: ContextInteractionCommandData;

	/**
	 * The interaction executor when it is called by the template handler.
	 * @param interaction The interaction that triggered this command.
	 */
	execute(
		interaction: Discord.ContextMenuCommandInteraction & { client: Client }
	): void | Promise<void>;
}

/**
 * Represents a ModalSubmit Interaction.
 */
export interface ModalInteractionCommand {
	/**
	 * The custom ID of the modal (submit) which was interacted with.
	 */
	init?: boolean;
	id: string;

	/**
	 * The interaction executor when it is called by the template handler.
	 * @param interaction The interaction that triggered this command.
	 */
	execute(
		interaction: Discord.ModalSubmitInteraction & { client: Client }
	): void | Promise<void>;
}

/**
 * Represents a Autocomplete Interaction.
 */
export interface AutocompleteInteraction {
	/**
	 * The command name of the autocomplete interaction which was interacted with.
	 */
	init?: boolean;
	name: string;

	/**
	 * The interaction executor when it is called by the template handler.
	 * @param interaction The interaction that triggered this command.
	 */
	execute(
		interaction: Discord.AutocompleteInteraction & { client: Client }
	): void | Promise<void>;
}

/**
 * Modified in-built Client that includes support for command/event handlers.
 */
export interface Client extends Discord.Client {
	/**
	 * Represents a collection of Application Commands (Slash Commands).
	 */
	slashCommands: Discord.Collection<string, SlashInteractionCommand>;

	/**
	 * Represents a collection of Button Interactions.
	 */
	buttonCommands: Discord.Collection<string, ButtonInteractionCommand>;

	/**
	 * Represents a collection of Select Interactions.
	 */
	selectCommands: Discord.Collection<string, SelectInteractionCommand>;

	/**
	 * Represents a collection of Context Interactions.
	 */
	contextCommands: Discord.Collection<string, ContextInteractionCommand>;

	/**
	 * Represents a collection of ModalSubmit Interactions.
	 */
	modalCommands: Discord.Collection<string, ModalInteractionCommand>;

	/**
	 * Represents a collection of autocomplete interactions.
	 */
	autocompleteInteractions: Discord.Collection<string, AutocompleteInteraction>;

	/**
	 * Represents a collection of chat-based Message Events.
	 */
	anyInteraction: Discord.Collection<string, any>;
}

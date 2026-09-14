export interface SessionInfo {
	started_at?: string;
	expires_at?: string;
	ip?: string;
	active_sessions?: number;
	env_file?: string;
	db_name?: string | null;
}

export interface WikiSyncConfig {
	enabled: boolean;
	write_enabled?: boolean;
}

export interface ApiMeta {
	enabled: boolean;
	docs?: boolean;
	scopes?: string[];
}

export interface AuthUser {
	authenticated: boolean;
	username: string;
	isDefault: boolean;
	session?: SessionInfo;
	links?: { discord?: string; github?: string };
	wiki_sync?: WikiSyncConfig;
	api?: ApiMeta;
}

export interface NamedCount {
	name: string;
	total: number;
	pct?: number;
	last_used?: string | null;
}

export interface GuildCommand {
	name: string;
	count: number;
}

export interface Guild {
	guild_id: string;
	name: string;
	setup: boolean;
	blocked?: boolean;
	blocked_source?: string;
	lang?: string;
	camp?: string;
	member_count: number;
	command_count: number;
	operation_count: number;
	stock_board_count: number;
	cmds_per_member?: number;
	activity?: string;
	joined_at?: string;
	left_at?: string;
	first_command_at?: string;
	last_command_at?: string;
	command_breakdown?: Record<string, number>;
	top_commands?: GuildCommand[];
}

export interface BlockedGuild {
	guild_id: string;
	name: string;
	source: string;
	active?: boolean;
	left_at?: string;
	can_unblacklist?: boolean;
}

export interface LeftGuild {
	guild_id: string;
	name: string;
	command_count: number;
	left_at?: string;
}

export interface SummaryKpis {
	active_guilds: number;
	total_seen_guilds: number;
	setup_servers: number;
	setup_rate_pct: number;
	pending_setup: number;
	left_guilds: number;
	total_commands: number;
	avg_commands_per_active: number;
	engaged_7d: number;
	engagement_7d_pct: number;
	total_members_active: number;
	avg_members: number;
	orderboards: number;
	orderboards_open: number;
	orderlines: number;
	stockpiles: number;
	total_stock_boards: number;
	operations_docs: number;
	total_operations: number;
	notifications: number;
	tracked_messages: number;
}

export interface WarVictoryTowns {
	colonial: number;
	warden: number;
	scorched?: number;
}

export interface WarData {
	available: boolean;
	warNumber?: number;
	ended?: boolean;
	winner?: string;
	conquestStartTime?: number;
	conquestEndTime?: number;
	scheduledConquestEndTime?: number;
	playersOnline?: number;
	requiredVictoryTowns?: number;
	effectiveRequiredVictoryTowns?: number;
	shortRequiredVictoryTowns?: number;
	victoryTowns?: WarVictoryTowns;
	dayOfWar?: number;
	elapsed?: { days: number; hours: number; minutes: number; seconds: number };
}

export interface ProductData {
	orderboards_by_kind: NamedCount[];
	orderboards_by_status: NamedCount[];
	orderlines_by_priority: NamedCount[];
	orderline_progress: { current?: number; target?: number; pct?: number };
	servers_by_lang: NamedCount[];
	servers_by_camp: NamedCount[];
	notifications_by_type: NamedCount[];
	operations_by_status: NamedCount[];
}

export interface ActivityData {
	buckets: NamedCount[];
	joins_by_month: { month: string; count: number }[];
	leaves_by_month: { month: string; count: number }[];
}

export interface SummaryPayload {
	generated_at: string;
	env_file?: string;
	db_name?: string;
	session?: SessionInfo;
	kpis: SummaryKpis;
	guilds: Guild[];
	blocked_guilds?: BlockedGuild[];
	left_guilds?: LeftGuild[];
	commands?: NamedCount[];
	top: { by_commands: Guild[]; by_members: Guild[] };
	activity: ActivityData;
	members: { distribution: NamedCount[] };
	product: ProductData;
	war?: WarData;
}

export interface MaterialCategory {
	id: string;
	icon?: string;
	subcategories?: string[];
}

export interface MaterialItem {
	itemName: string;
	itemDesc?: string;
	category: string;
	subcategory: string;
	itemCategory?: string;
	categoryIcon?: string;
	faction?: string[];
	iconUrl?: string;
	wikiUrl?: string;
	damageDesc?: string;
	vehiclePen?: string;
	highVelocityBonus?: string;
	numberProducedBonus?: string;
}

export interface MaterialsPayload {
	items: MaterialItem[];
	categories: MaterialCategory[];
	icons?: { with_icon?: number };
}

export interface ContactUser {
	user_id: string;
	display_name?: string;
	username?: string;
	avatar_url?: string;
	profile_url?: string;
}

export interface ContactGuild {
	guild_id: string;
	name: string;
	active: boolean;
	member_count: number;
	joined_at?: string;
	left_at?: string;
	command_count: number;
	last_command_at?: string | null;
	lang?: string | null;
	activity?: string;
	owner?: ContactUser;
	creators?: (ContactUser & { stockpiles?: number; operations?: number; boards?: number; lines?: number })[];
}

export interface ContactPerson extends ContactUser {
	roles?: string[];
	guild_count?: number;
	last_active_at?: number;
	guilds?: { guild_id: string; name: string; role: string; active?: boolean }[];
}

export interface ContactsPayload {
	generated_at: string;
	discord_token?: boolean;
	kpis: {
		active_guilds: number;
		left_guilds: number;
		with_owner: number;
		unique_people: number;
	};
	guilds: ContactGuild[];
	people: ContactPerson[];
}

export interface ApiToken {
	jti: string;
	label: string;
	scopes: string[];
	token_prefix?: string;
	expires_at?: string;
}

export interface WikiSyncJob {
	job_id?: string;
	status: string;
	phase?: string;
	progress?: Record<string, unknown> | null;
	dry_run?: boolean;
	logs?: { message: string }[];
	report?: {
		dry_run?: boolean;
		icons?: { downloaded: number; failed: number; skipped_existing: number };
	};
	error?: { message?: string };
}

export type SettingsTab = 'account' | 'api' | 'wiki';

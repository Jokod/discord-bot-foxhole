export const API_SCOPE_DEFS = [
	{
		id: 'materials',
		paths: [
			'/api/public/materials/categories',
			'/api/public/materials/items',
		],
		label: 'profile.apiTokens.scopeMaterials',
		desc: 'settings.api.scopeMaterialsDesc',
	},
	{
		id: 'data',
		paths: ['/api/public/data'],
		label: 'profile.apiTokens.scopeData',
		desc: 'settings.api.scopeDataDesc',
	},
	{
		id: 'guilds',
		paths: ['/api/public/guilds'],
		label: 'profile.apiTokens.scopeGuilds',
		desc: 'settings.api.scopeGuildsDesc',
	},
] as const;

export type ApiScopeId = typeof API_SCOPE_DEFS[number]['id'];

export function scopePaths(scope: typeof API_SCOPE_DEFS[number]) {
	return scope.paths;
}

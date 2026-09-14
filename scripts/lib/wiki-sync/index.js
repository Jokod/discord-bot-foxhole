'use strict';

const config = require('./config');
const {
	inferWikiTitle,
	resolveWikiTitle,
	resolveIconWikiTitle,
	isFrenchUniformEntry,
	wikiFactionToArray,
	canonicalInfoboxNameForCatalog,
	asciiQuotesToCurly,
	sleep,
} = require('./wiki/title-resolver');
const {
	descriptionFromWikitext,
	extractQuoteDescription,
	extractLeadDescription,
	stripWikiMarkup,
} = require('./wiki/description');
const {
	parseItemOrVehicleInfobox,
	extractFirstInfoboxFaction,
	extractInfoboxImage,
} = require('./wiki/infobox-parser');
const {
	routeWikiInfoboxToMaterialFile,
	isHeavyAmmoItem,
	routeHeavyAmmo,
	routeResourceInfobox,
} = require('./wiki/router');
const {
	createWikiClient,
	fetchCategoryPageTitles,
	fetchWikitextForTitles,
} = require('./wiki/client');
const { PageCache } = require('./wiki/cache');
const { RateLimiter } = require('./wiki/rate-limiter');
const {
	sortMaterialsByName,
	relPathUnderMaterialsRoot,
	loadAllMaterialFiles,
	writeMaterialFile,
	applyCatalogMaintenance,
	flushModifiedMaterialFiles,
	catalogItemNames,
} = require('./core/catalog');
const {
	runWikiSync,
	runAddMissing,
	runSyncDescriptionsAndFactions,
	isWriteAllowed,
} = require('./core/pipeline');
const {
	PUBLIC_ICON_PREFIX,
	MAX_ICON_BYTES,
	ALLOWED_ICON_HOSTS,
	safeIconFilename,
	canonicalIconFilename,
	mediaWikiFileKey,
	isAllowedIconUrl,
	detectImageKind,
	extensionMatchesKind,
	fetchImageInfoUrls,
	downloadBinary,
	runSyncMaterialIcons,
} = require('./wiki/sync-icons');
const { parseWikiSyncArgs } = require('./cli/parse-args');
const { runCli } = require('./cli/run');

module.exports = {
	...config,
	RESOURCE_NAME_TO_REL: require('./config/routing/rules').RESOURCE_NAME_TO_REL,
	inferWikiTitle,
	resolveWikiTitle,
	resolveIconWikiTitle,
	isFrenchUniformEntry,
	wikiFactionToArray,
	canonicalInfoboxNameForCatalog,
	asciiQuotesToCurly,
	sleep,
	descriptionFromWikitext,
	extractQuoteDescription,
	extractLeadDescription,
	stripWikiMarkup,
	parseItemOrVehicleInfobox,
	extractFirstInfoboxFaction,
	extractInfoboxImage,
	routeWikiInfoboxToMaterialFile,
	isHeavyAmmoItem,
	routeHeavyAmmo,
	routeResourceInfobox,
	createWikiClient,
	fetchCategoryPageTitles,
	fetchWikitextForTitles,
	PageCache,
	RateLimiter,
	sortMaterialsByName,
	relPathUnderMaterialsRoot,
	loadAllMaterialFiles,
	writeMaterialFile,
	applyCatalogMaintenance,
	flushModifiedMaterialFiles,
	catalogItemNames,
	runWikiSync,
	runAddMissing,
	runSyncDescriptionsAndFactions,
	isWriteAllowed,
	PUBLIC_ICON_PREFIX,
	MAX_ICON_BYTES,
	ALLOWED_ICON_HOSTS,
	safeIconFilename,
	canonicalIconFilename,
	mediaWikiFileKey,
	isAllowedIconUrl,
	detectImageKind,
	extensionMatchesKind,
	fetchImageInfoUrls,
	downloadBinary,
	runSyncMaterialIcons,
	parseWikiSyncArgs,
	runCli,
};

'use strict';

function parseWikiSyncArgs(argv = process.argv.slice(2)) {
	const dryRun = argv.includes('--dry-run');
	const descOnly = argv.includes('--desc-only');
	const addMissing = argv.includes('--add-missing');
	const addMissingOnly = argv.includes('--add-missing-only');
	const syncIcons = argv.includes('--sync-icons');
	const forceIcons = argv.includes('--force');
	const dashboard = argv.includes('--dashboard');

	return {
		dryRun,
		descOnly,
		addMissing,
		addMissingOnly,
		syncIcons,
		forceIcons,
		dashboard,
		argv,
	};
}

module.exports = {
	parseWikiSyncArgs,
};

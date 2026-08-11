'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SUMMARY_PATH = path.join(ROOT, 'coverage', 'coverage-summary.json');
const BADGE_PATH = path.join(ROOT, 'badges', 'coverage.json');

function colorForPct(pct) {
	if (pct >= 80) return 'brightgreen';
	if (pct >= 70) return 'green';
	if (pct >= 60) return 'yellow';
	if (pct >= 50) return 'orange';
	return 'red';
}

function main() {
	if (!fs.existsSync(SUMMARY_PATH)) {
		console.error(`Missing ${path.relative(ROOT, SUMMARY_PATH)}. Run coverage first.`);
		process.exit(1);
	}

	const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
	const pct = summary?.total?.lines?.pct;
	if (typeof pct !== 'number' || Number.isNaN(pct)) {
		console.error('coverage-summary.json has no total.lines.pct');
		process.exit(1);
	}

	const rounded = Math.round(pct * 10) / 10;
	const badge = {
		schemaVersion: 1,
		label: 'coverage',
		message: `${rounded}%`,
		color: colorForPct(rounded),
	};

	fs.mkdirSync(path.dirname(BADGE_PATH), { recursive: true });
	fs.writeFileSync(BADGE_PATH, `${JSON.stringify(badge, null, '\t')}\n`);
	console.log(`Updated ${path.relative(ROOT, BADGE_PATH)} → ${badge.message} (${badge.color})`);
}

main();

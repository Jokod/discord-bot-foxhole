'use strict';

function createReport({ log = (msg) => process.stderr.write(`${msg}\n`) } = {}) {
	const phases = [];

	return {
		log,
		phase(name, detail) {
			phases.push({ name, detail, at: Date.now() });
			if (detail) {
				log(`${name}: ${detail}`);
			}
			else {
				log(name);
			}
		},
		getPhases() {
			return [...phases];
		},
	};
}

function emitProgress(onProgress, event) {
	if (typeof onProgress === 'function') {
		onProgress(event);
	}
}

module.exports = {
	createReport,
	emitProgress,
};

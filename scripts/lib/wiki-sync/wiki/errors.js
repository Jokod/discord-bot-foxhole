'use strict';

class WikiSyncError extends Error {
	constructor(message, { code } = {}) {
		super(message);
		this.name = 'WikiSyncError';
		this.code = code;
	}
}

class WikiApiError extends WikiSyncError {
	constructor(code, info) {
		super(`API: ${code} — ${info}`, { code });
		this.name = 'WikiApiError';
	}
}

class WikiCategoryApiError extends WikiSyncError {
	constructor(code, info) {
		super(`API categorymembers: ${code} — ${info}`, { code });
		this.name = 'WikiCategoryApiError';
	}
}

class WikiImageApiError extends WikiSyncError {
	constructor(code, info) {
		super(`API imageinfo: ${code} — ${info}`, { code });
		this.name = 'WikiImageApiError';
	}
}

class WikiRateLimitError extends WikiSyncError {
	constructor(message = 'Max wiki requests per run exceeded') {
		super(message, { code: 'rate_limit' });
		this.name = 'WikiRateLimitError';
	}
}

class WikiAbortedError extends WikiSyncError {
	constructor(message = 'Wiki sync aborted') {
		super(message, { code: 'WIKI_SYNC_ABORTED' });
		this.name = 'WikiAbortedError';
	}
}

function assertNotAborted(shouldAbort) {
	if (typeof shouldAbort === 'function' && shouldAbort()) {
		throw new WikiAbortedError();
	}
}

module.exports = {
	WikiSyncError,
	WikiApiError,
	WikiCategoryApiError,
	WikiImageApiError,
	WikiRateLimitError,
	WikiAbortedError,
	assertNotAborted,
};

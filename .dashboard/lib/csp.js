'use strict';

// Firefox may inject a tiny inline helper on login forms; hash from DevTools CSP report.
const FIREFOX_INLINE_SCRIPT_HASH = '\'sha256-PG9x+1KqJ9AgIB7FzL0YalSXmqEKtvw9Wm9Rb3a9zdU=\'';

const DASHBOARD_CSP = [
	'default-src \'self\'',
	`script-src 'self' ${FIREFOX_INLINE_SCRIPT_HASH}`,
	'style-src \'self\' \'unsafe-inline\'',
	'font-src \'self\' data:',
	'img-src \'self\' data:',
	'connect-src \'self\'',
	'frame-ancestors \'none\'',
	'base-uri \'self\'',
	'form-action \'self\'',
].join('; ');

const SWAGGER_CSP = [
	'default-src \'self\'',
	'script-src \'self\'',
	'style-src \'self\' \'unsafe-inline\'',
	'font-src \'self\' data:',
	'img-src \'self\' data:',
	'connect-src \'self\'',
	'frame-ancestors \'none\'',
	'base-uri \'self\'',
].join('; ');

module.exports = { DASHBOARD_CSP, SWAGGER_CSP };

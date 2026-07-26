const fs = require('fs');
const path = require('path');

const NEWSLETTER_FILE = path.join(__dirname, '../data/newsletter.md');
const DISCORD_CONTENT_LIMIT = 2000;

/**
 * Read markdown content from data/newsletter.md.
 * @returns {{ content: string } | { error: 'missing' | 'empty' | 'too_long', length?: number }}
 */
function readNewsletterFile(filePath = NEWSLETTER_FILE) {
	if (!fs.existsSync(filePath)) {
		return { error: 'missing' };
	}

	const content = fs.readFileSync(filePath, 'utf8').trim();
	if (!content) {
		return { error: 'empty' };
	}
	if (content.length > DISCORD_CONTENT_LIMIT) {
		return { error: 'too_long', length: content.length };
	}

	return { content };
}

module.exports = {
	NEWSLETTER_FILE,
	DISCORD_CONTENT_LIMIT,
	readNewsletterFile,
};

const fs = require('fs');
const os = require('os');
const path = require('path');
const { DISCORD_CONTENT_LIMIT, readNewsletterFile } = require('../../utils/newsletter.js');

describe('utils/newsletter', () => {
	let tmpFile;

	afterEach(() => {
		if (tmpFile && fs.existsSync(tmpFile)) {
			fs.unlinkSync(tmpFile);
		}
		tmpFile = undefined;
	});

	it('retourne missing si le fichier n’existe pas', () => {
		expect(readNewsletterFile('/tmp/does-not-exist-newsletter.md')).toEqual({ error: 'missing' });
	});

	it('retourne empty si le fichier est vide', () => {
		tmpFile = path.join(os.tmpdir(), `newsletter-empty-${Date.now()}.md`);
		fs.writeFileSync(tmpFile, '  \n  ', 'utf8');
		expect(readNewsletterFile(tmpFile)).toEqual({ error: 'empty' });
	});

	it('retourne too_long si le contenu dépasse la limite Discord', () => {
		tmpFile = path.join(os.tmpdir(), `newsletter-long-${Date.now()}.md`);
		fs.writeFileSync(tmpFile, 'x'.repeat(DISCORD_CONTENT_LIMIT + 1), 'utf8');
		expect(readNewsletterFile(tmpFile)).toEqual({
			error: 'too_long',
			length: DISCORD_CONTENT_LIMIT + 1,
		});
	});

	it('retourne le contenu trimé', () => {
		tmpFile = path.join(os.tmpdir(), `newsletter-ok-${Date.now()}.md`);
		fs.writeFileSync(tmpFile, '  **News**\n\n- item  \n', 'utf8');
		expect(readNewsletterFile(tmpFile)).toEqual({ content: '**News**\n\n- item' });
	});
});

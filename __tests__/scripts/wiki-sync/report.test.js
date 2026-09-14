'use strict';

const { createReport, emitProgress } = require('../../../scripts/lib/wiki-sync/core/report');

describe('wiki-sync / report', () => {
	it('createReport journalise avec ou sans détail', () => {
		const log = jest.fn();
		const report = createReport({ log });

		report.phase('maintenance');
		report.phase('add-missing', '3 pages');

		expect(log).toHaveBeenCalledWith('maintenance');
		expect(log).toHaveBeenCalledWith('add-missing: 3 pages');
		expect(report.getPhases()).toHaveLength(2);
		expect(report.getPhases()[0]).toMatchObject({ name: 'maintenance', detail: undefined });
	});

	it('createReport utilise stderr par défaut', () => {
		const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
		const report = createReport();
		report.phase('done');
		expect(stderr).toHaveBeenCalledWith('done\n');
		stderr.mockRestore();
	});

	it('emitProgress appelle le callback si fonction', () => {
		const onProgress = jest.fn();
		emitProgress(onProgress, { phase: 'start' });
		emitProgress(null, { phase: 'ignored' });
		emitProgress(undefined, { phase: 'ignored' });
		expect(onProgress).toHaveBeenCalledWith({ phase: 'start' });
	});
});

'use strict';

/**
 * Dump / restore FoxBot MongoDB using mongodump / mongorestore.
 *
 *   node scripts/mongo-backup.js dump
 *   node scripts/mongo-backup.js restore
 *   MONGO_ENV_FILE=.env MONGO_DUMP_DIR=var/mongo-dump node scripts/mongo-backup.js dump
 *
 * Prefers local mongodump; falls back to `docker run --rm mongo:7 …`.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const envFile = process.env.MONGO_ENV_FILE || '.env.prod';
const envPath = path.isAbsolute(envFile) ? envFile : path.join(ROOT, envFile);

require('dotenv').config({ path: envPath });

const url = (process.env.MONGODB_URL || '').trim();
const db = (process.env.MONGODB_NAME || '').trim();
const dumpRoot = path.resolve(ROOT, process.env.MONGO_DUMP_DIR || 'var/mongo-dump');
const mongoImage = process.env.MONGO_TOOLS_IMAGE || 'mongo:7';

function die(msg, code = 1) {
	console.error(msg);
	process.exit(code);
}

function hasBin(name) {
	const r = spawnSync('sh', ['-c', `command -v ${name}`], { encoding: 'utf8' });
	return r.status === 0 && Boolean((r.stdout || '').trim());
}

function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
	if (r.error) die(r.error.message);
	process.exit(r.status == null ? 1 : r.status);
}

function toolRunner(tool) {
	if (hasBin(tool)) {
		return { mode: 'local', run: (args) => run(tool, args) };
	}
	if (!hasBin('docker')) {
		die(
			`${tool} introuvable et docker absent.\n`
			+ 'Installe MongoDB Database Tools :\n'
			+ '  curl -fsSL -O https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2404-x86_64-100.12.2.deb\n'
			+ '  sudo dpkg -i mongodb-database-tools-ubuntu2404-x86_64-100.12.2.deb',
		);
	}
	return {
		mode: 'docker',
		run: (hostArgs, volumeMounts) => {
			const dockerArgs = ['run', '--rm'];
			for (const [host, container] of volumeMounts) {
				dockerArgs.push('-v', `${host}:${container}`);
			}
			dockerArgs.push(mongoImage, tool, ...hostArgs);
			console.log(`[mongo-backup] via docker (${mongoImage})`);
			run('docker', dockerArgs);
		},
	};
}

function resolveDumpDir() {
	let dir = (process.env.MONGO_RESTORE_DIR || '').trim();
	if (dir) {
		dir = path.isAbsolute(dir) ? dir : path.join(ROOT, dir);
		if (!fs.existsSync(dir)) die(`Dossier dump introuvable: ${dir}`);
		return dir;
	}
	if (!fs.existsSync(dumpRoot)) die(`Aucun dump dans ${dumpRoot}`);
	const stamps = fs.readdirSync(dumpRoot)
		.filter((n) => fs.statSync(path.join(dumpRoot, n)).isDirectory())
		.sort()
		.reverse();
	if (!stamps.length) die(`Aucun dump dans ${dumpRoot}`);
	return path.join(dumpRoot, stamps[0]);
}

function cmdDump() {
	if (!url || !db) die(`MONGODB_URL et MONGODB_NAME requis dans ${envPath}`);
	const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const out = path.join(dumpRoot, stamp);
	fs.mkdirSync(out, { recursive: true });
	console.log(`[mongo-dump] env=${path.basename(envPath)} db=${db} → ${out}`);

	const tools = toolRunner('mongodump');
	if (tools.mode === 'local') {
		tools.run([`--uri=${url}`, `--db=${db}`, `--out=${out}`]);
		return;
	}
	tools.run(
		[`--uri=${url}`, `--db=${db}`, '--out=/dump'],
		[[out, '/dump']],
	);
}

function cmdRestore() {
	if (!url || !db) die(`MONGODB_URL et MONGODB_NAME requis dans ${envPath}`);
	const dir = resolveDumpDir();
	const dataDir = fs.existsSync(path.join(dir, db)) ? path.join(dir, db) : dir;
	console.log(`[mongo-restore] env=${path.basename(envPath)} ${dataDir} → ${db}`);

	const tools = toolRunner('mongorestore');
	if (tools.mode === 'local') {
		tools.run([`--uri=${url}`, `--db=${db}`, '--drop', dataDir]);
		return;
	}
	tools.run(
		[`--uri=${url}`, `--db=${db}`, '--drop', '/dump'],
		[[dataDir, '/dump']],
	);
}

const cmd = process.argv[2];
if (cmd === 'dump') cmdDump();
else if (cmd === 'restore') cmdRestore();
else die('Usage: node scripts/mongo-backup.js <dump|restore>');

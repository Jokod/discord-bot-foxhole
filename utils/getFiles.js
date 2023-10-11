const fs = require('fs');
const path = require('path');

const getFiles = (dir, callback) => {
	const files = fs.readdirSync(dir);

	files.forEach((file) => {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			getFiles(filePath, callback);
		}
		else if (file.endsWith('.js')) {
			const command = require('../' + filePath);
			callback(command, filePath);
		}
	});
};

module.exports = getFiles;

const Operation = require('./models/operation.js');
const Material = require('./models/logistic/material.js');
const Group = require('./models/logistic/group.js');
const Server = require('./models/server/server.js');
const Stockpile = require('./models/logistic/stockpile.js');
const Stats = require('./models/stats/stats.js');

module.exports = {
	Operation,
	Material,
	Group,
	Server,
	Stockpile,
	Stats,
};

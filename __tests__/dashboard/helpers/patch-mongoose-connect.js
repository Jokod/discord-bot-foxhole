'use strict';

process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost/test';
process.env.DASHBOARD_PORT = process.env.DASHBOARD_PORT || '3998';

const path = require('path');
const mongoose = require(path.join(__dirname, '../../../.dashboard/lib/db'));
mongoose.connect = () => Promise.reject(new Error('connect fail'));

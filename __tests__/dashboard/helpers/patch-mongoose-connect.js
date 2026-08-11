'use strict';

process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost/test';
process.env.DASHBOARD_PORT = process.env.DASHBOARD_PORT || '3998';

const mongoose = require('mongoose');
mongoose.connect = () => Promise.reject(new Error('connect fail'));

const mongoose = require('mongoose');
require('dotenv').config();

const createApp = require('./app');
const logger = require('./utils/logger');

const app = createApp();
const PORT = process.env.PORT || 5000;

async function connectDatabase(uri = process.env.MONGODB_URI) {
    await mongoose.connect(uri);
    return mongoose.connection;
}

async function startServer() {
    await connectDatabase();
    logger.info('mongodb_connected');

    return new Promise((resolve) => {
        const server = app.listen(PORT, () => {
            logger.info('server_started', { port: PORT });
            resolve(server);
        });
    });
}

if (require.main === module) {
    startServer().catch((err) => {
        logger.error('server_start_failed', { error: err.message });
        process.exit(1);
    });
}

module.exports = {
    app,
    startServer,
    connectDatabase
};

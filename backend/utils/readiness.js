const mongoose = require('mongoose');
const { getEmailReadiness } = require('./email');

const READY_STATE_LABELS = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
};

const getDatabaseReadiness = (connection = mongoose.connection) => {
    const readyState = connection.readyState;

    return {
        ready: readyState === 1,
        state: READY_STATE_LABELS[readyState] || 'unknown',
        name: connection.name || undefined,
        host: connection.host || undefined
    };
};

const isOverallReady = ({ database, email }) => {
    return Boolean(database?.ready) && (Boolean(email?.ready) || !Boolean(email?.required));
};

const buildReadinessReport = ({ database, email, timestamp = new Date().toISOString() }) => {
    return {
        status: isOverallReady({ database, email }) ? 'ready' : 'not_ready',
        timestamp,
        checks: {
            database,
            email
        }
    };
};

const getReadinessReport = async () => {
    const database = getDatabaseReadiness();
    const email = await getEmailReadiness();

    return buildReadinessReport({ database, email });
};

module.exports = {
    getDatabaseReadiness,
    isOverallReady,
    buildReadinessReport,
    getReadinessReport
};

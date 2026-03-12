const SENSITIVE_KEYS = new Set([
    'password',
    'token',
    'authorization',
    'smtp_pass',
    'jwt_secret'
]);

const redactValue = (key, value) => {
    if (value === undefined) return undefined;
    if (SENSITIVE_KEYS.has(String(key).toLowerCase())) return '[REDACTED]';
    return value;
};

const sanitizeMeta = (meta = {}) => {
    const result = {};
    Object.entries(meta).forEach(([key, value]) => {
        if (value === undefined) return;
        result[key] = redactValue(key, value);
    });
    return result;
};

const formatLog = (level, message, meta = {}) => {
    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...sanitizeMeta(meta)
    });
};

const logWithLevel = (level, message, meta) => {
    const isTestEnv = process.env.NODE_ENV === 'test';
    if (isTestEnv && process.env.ENABLE_TEST_LOGS !== 'true') {
        return;
    }

    const payload = formatLog(level, message, meta);
    if (level === 'error') {
        console.error(payload);
        return;
    }
    if (level === 'warn') {
        console.warn(payload);
        return;
    }
    console.log(payload);
};

module.exports = {
    info: (message, meta) => logWithLevel('info', message, meta),
    warn: (message, meta) => logWithLevel('warn', message, meta),
    error: (message, meta) => logWithLevel('error', message, meta),
    alert: (message, meta) => logWithLevel('alert', message, meta)
};

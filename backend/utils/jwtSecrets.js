const splitSecrets = (value) => {
    if (!value) return [];

    return String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
};

const getJwtSigningSecret = () => {
    const signingSecret = (process.env.JWT_SECRET || '').trim();
    if (!signingSecret) {
        throw new Error('JWT_SIGNING_SECRET_MISSING');
    }
    return signingSecret;
};

const getJwtVerificationSecrets = () => {
    const primary = getJwtSigningSecret();
    const previous = splitSecrets(process.env.JWT_SECRET_PREVIOUS);

    return Array.from(new Set([primary, ...previous]));
};

module.exports = {
    splitSecrets,
    getJwtSigningSecret,
    getJwtVerificationSecrets
};
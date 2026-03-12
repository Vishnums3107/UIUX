const nodemailer = require('nodemailer');

const getBooleanEnv = (value, defaultValue = false) => {
    if (value === undefined) return defaultValue;
    return String(value).toLowerCase() === 'true';
};

const hasEmailConfig = () => {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.MAIL_FROM
    );
};

const readPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: getBooleanEnv(process.env.SMTP_SECURE, Number(process.env.SMTP_PORT) === 465),
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

const withTimeout = (promise, timeoutMs) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('EMAIL_VERIFY_TIMEOUT'));
        }, timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
};

const shouldVerifyTransportForReadiness = () => {
    if (process.env.READINESS_EMAIL_VERIFY !== undefined) {
        return getBooleanEnv(process.env.READINESS_EMAIL_VERIFY, false);
    }

    return process.env.NODE_ENV === 'production';
};

const verifyEmailTransport = async () => {
    if (!hasEmailConfig()) {
        return { ok: false, reason: 'not_configured' };
    }

    const transporter = createTransporter();
    const timeoutMs = readPositiveInt(process.env.READINESS_EMAIL_VERIFY_TIMEOUT_MS, 2500);

    try {
        await withTimeout(transporter.verify(), timeoutMs);
        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            reason: 'verify_failed',
            detail: err?.message || 'EMAIL_VERIFY_FAILED'
        };
    }
};

const getEmailReadiness = async () => {
    const required = process.env.NODE_ENV === 'production';
    const configured = hasEmailConfig();

    if (!configured) {
        return {
            ready: false,
            required,
            configured,
            reason: 'not_configured'
        };
    }

    if (!shouldVerifyTransportForReadiness()) {
        return {
            ready: true,
            required,
            configured,
            verification: 'skipped'
        };
    }

    const verification = await verifyEmailTransport();
    if (verification.ok) {
        return {
            ready: true,
            required,
            configured,
            verification: 'ok'
        };
    }

    const payload = {
        ready: false,
        required,
        configured,
        reason: verification.reason
    };

    if (process.env.NODE_ENV !== 'production' && verification.detail) {
        payload.detail = verification.detail;
    }

    return payload;
};

const buildPasswordResetUrl = (token) => {
    const customBase = (process.env.PASSWORD_RESET_URL || '').trim();
    if (customBase) {
        return `${customBase.replace(/\/+$/, '')}/${token}`;
    }

    const frontendBase = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*'
        ? process.env.FRONTEND_URL
        : 'http://localhost:5173';

    return `${frontendBase.replace(/\/+$/, '')}/resetpassword/${token}`;
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
    if (!hasEmailConfig()) {
        return { sent: false, reason: 'EMAIL_NOT_CONFIGURED' };
    }

    const transporter = createTransporter();
    const fromName = process.env.MAIL_FROM_NAME || 'Tamil Learning Platform';

    await transporter.sendMail({
        from: `"${fromName}" <${process.env.MAIL_FROM}>`,
        to,
        subject: 'Reset your Tamil Learning password',
        text: [
            `Hi ${name || 'Learner'},`,
            '',
            'We received a request to reset your password.',
            `Reset link: ${resetUrl}`,
            '',
            'This link expires in 15 minutes.',
            'If you did not request this, you can ignore this email.'
        ].join('\n')
    });

    return { sent: true };
};

module.exports = {
    hasEmailConfig,
    createTransporter,
    verifyEmailTransport,
    getEmailReadiness,
    buildPasswordResetUrl,
    sendPasswordResetEmail
};

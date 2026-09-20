const parseArgs = (argv) => {
    const args = {};

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;

        const key = token.slice(2);
        const value = argv[i + 1];

        if (!value || value.startsWith('--')) {
            args[key] = 'true';
            continue;
        }

        args[key] = value;
        i += 1;
    }

    return args;
};

const asPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const toBaseUrl = (value) => {
    if (!value) return '';
    return String(value).trim().replace(/\/+$/, '');
};

const requestJson = async (url, timeoutMs) => {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    const response = await Promise.race([
        fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' }
        }),
        timeoutPromise
    ]);

    let body = null;
    try {
        body = await response.json();
    } catch {
        body = null;
    }

    return {
        ok: response.ok,
        status: response.status,
        body
    };
};

const fetchWithRetry = async ({ url, retries, retryDelayMs, timeoutMs }) => {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const result = await requestJson(url, timeoutMs);
            return { ...result, attempt };
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await sleep(retryDelayMs);
            }
        }
    }

    throw lastError;
};

const print = (message) => {
    process.stdout.write(`${message}\n`);
};

const fail = (message) => {
    process.stderr.write(`${message}\n`);
};

const run = async () => {
    const args = parseArgs(process.argv.slice(2));
    const baseUrl = toBaseUrl(args.baseUrl || process.env.BACKEND_BASE_URL);

    if (!baseUrl) {
        fail('Missing required target URL. Provide --baseUrl or BACKEND_BASE_URL.');
        process.exit(1);
    }

    const retries = asPositiveInt(args.retries, 3);
    const retryDelayMs = asPositiveInt(args.retryDelayMs, 2000);
    const timeoutMs = asPositiveInt(args.timeoutMs, 8000);

    print('Phase 4 post-deploy verification started.');
    print(`Target base URL: ${baseUrl}`);
    print(`Retries: ${retries}, timeoutMs: ${timeoutMs}, retryDelayMs: ${retryDelayMs}`);

    const healthUrl = `${baseUrl}/api/health`;
    const readinessUrl = `${baseUrl}/api/readiness`;

    const health = await fetchWithRetry({
        url: healthUrl,
        retries,
        retryDelayMs,
        timeoutMs
    });

    if (!health.ok || health.status !== 200 || health.body?.status !== 'ok') {
        fail(`Health check failed at ${healthUrl}`);
        fail(`HTTP status: ${health.status}`);
        fail(`Body: ${JSON.stringify(health.body || {})}`);
        process.exit(1);
    }

    print(`Health check passed (attempt ${health.attempt}, uptimeSeconds=${health.body?.uptimeSeconds ?? 'n/a'}).`);

    const readiness = await fetchWithRetry({
        url: readinessUrl,
        retries,
        retryDelayMs,
        timeoutMs
    });

    const dbReady = Boolean(readiness.body?.checks?.database?.ready);
    const emailRequired = Boolean(readiness.body?.checks?.email?.required);
    const emailReady = Boolean(readiness.body?.checks?.email?.ready);

    const readinessValid = (
        readiness.ok
        && readiness.status === 200
        && readiness.body?.status === 'ready'
        && dbReady
        && (!emailRequired || emailReady)
    );

    if (!readinessValid) {
        fail(`Readiness check failed at ${readinessUrl}`);
        fail(`HTTP status: ${readiness.status}`);
        fail(`Body: ${JSON.stringify(readiness.body || {})}`);
        process.exit(1);
    }

    print(`Readiness check passed (attempt ${readiness.attempt}, database=${dbReady}, emailRequired=${emailRequired}, emailReady=${emailReady}).`);
    print('Phase 4 post-deploy verification completed successfully.');
};

run().catch((error) => {
    fail(`Verification failed with error: ${error.message}`);
    process.exit(1);
});

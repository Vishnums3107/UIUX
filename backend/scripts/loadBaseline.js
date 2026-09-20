const fs = require('fs');
const path = require('path');
const http = require('http');

const createApp = require('../app');

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

const asPositiveNumber = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const percentile = (values, p) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
    );
    return sorted[index];
};

const normalizeStamp = (value = new Date().toISOString()) => {
    return value
        .replace(/[:]/g, '-')
        .replace(/\..+$/, 'Z')
        .replace('T', '_');
};

const buildMarkdown = (report) => {
    return [
        '# Load Baseline Evidence',
        '',
        `- Run date: ${report.runDate}`,
        `- Target URL: ${report.targetUrl}`,
        `- Duration seconds (configured): ${report.config.durationSeconds}`,
        `- Concurrency: ${report.config.concurrency}`,
        `- Max requests: ${report.config.maxRequests}`,
        '',
        '## Results',
        '',
        `- Total requests: ${report.results.totalRequests}`,
        `- Successful requests: ${report.results.successfulRequests}`,
        `- Failed requests: ${report.results.failedRequests}`,
        `- Success rate: ${report.results.successRatePct}%`,
        `- Throughput: ${report.results.throughputRps} req/s`,
        `- p95 latency: ${report.results.p95LatencyMs} ms`,
        '',
        '## Threshold Evaluation',
        '',
        `- Min success rate (${report.thresholds.minSuccessRatePct}%): ${report.evaluation.successRatePass ? 'PASS' : 'FAIL'}`,
        `- Min throughput (${report.thresholds.minThroughputRps} req/s): ${report.evaluation.throughputPass ? 'PASS' : 'FAIL'}`,
        `- Max p95 latency (${report.thresholds.maxP95LatencyMs} ms): ${report.evaluation.p95Pass ? 'PASS' : 'FAIL'}`,
        `- Overall: ${report.evaluation.overallPass ? 'PASS' : 'FAIL'}`,
        '',
        '## Notes',
        '',
        '- Baseline run targets `/api/health` and stays below default API rate-limit caps to avoid throttle distortion.',
        '- Use higher-limit staging profiles for sustained throughput characterization.'
    ].join('\n');
};

const run = async () => {
    const args = parseArgs(process.argv.slice(2));

    const durationSeconds = asPositiveInt(args.durationSeconds, 30);
    const concurrency = asPositiveInt(args.concurrency, 6);
    const maxRequests = asPositiveInt(args.maxRequests, 150);

    const minSuccessRatePct = asPositiveNumber(args.minSuccessRatePct, 99);
    const minThroughputRps = asPositiveNumber(args.minThroughputRps, 8);
    const maxP95LatencyMs = asPositiveNumber(args.maxP95LatencyMs, 200);

    const app = createApp();
    const server = http.createServer(app);

    await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    const targetUrl = `http://127.0.0.1:${address.port}/api/health`;

    const latencies = [];
    let successfulRequests = 0;
    let failedRequests = 0;
    let issuedRequests = 0;

    const startMs = Date.now();
    const endByTimeMs = startMs + (durationSeconds * 1000);

    const worker = async () => {
        while (Date.now() < endByTimeMs) {
            if (issuedRequests >= maxRequests) break;
            issuedRequests += 1;

            const requestStart = Date.now();
            try {
                const response = await fetch(targetUrl, {
                    method: 'GET',
                    headers: { Accept: 'application/json' }
                });

                const latency = Date.now() - requestStart;
                latencies.push(latency);

                if (response.ok) {
                    successfulRequests += 1;
                } else {
                    failedRequests += 1;
                }
            } catch {
                const latency = Date.now() - requestStart;
                latencies.push(latency);
                failedRequests += 1;
            }
        }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    const endMs = Date.now();
    const durationActualSeconds = Math.max(1, (endMs - startMs) / 1000);
    const totalRequests = successfulRequests + failedRequests;

    const successRatePct = totalRequests === 0
        ? 0
        : Number(((successfulRequests / totalRequests) * 100).toFixed(2));

    const throughputRps = Number((totalRequests / durationActualSeconds).toFixed(2));
    const p95LatencyMs = Number(percentile(latencies, 95).toFixed(2));

    const evaluation = {
        successRatePass: successRatePct >= minSuccessRatePct,
        throughputPass: throughputRps >= minThroughputRps,
        p95Pass: p95LatencyMs <= maxP95LatencyMs
    };
    evaluation.overallPass = evaluation.successRatePass && evaluation.throughputPass && evaluation.p95Pass;

    const report = {
        runDate: new Date().toISOString(),
        targetUrl,
        config: {
            durationSeconds,
            concurrency,
            maxRequests
        },
        thresholds: {
            minSuccessRatePct,
            minThroughputRps,
            maxP95LatencyMs
        },
        results: {
            totalRequests,
            successfulRequests,
            failedRequests,
            successRatePct,
            throughputRps,
            p95LatencyMs,
            durationActualSeconds: Number(durationActualSeconds.toFixed(2))
        },
        evaluation
    };

    const repoRoot = path.resolve(__dirname, '..', '..');
    const evidenceDir = path.join(repoRoot, 'docs', 'release-evidence');
    fs.mkdirSync(evidenceDir, { recursive: true });

    const stamp = normalizeStamp(report.runDate);
    const jsonPath = path.join(evidenceDir, `load-baseline-${stamp}.json`);
    const markdownPath = path.join(evidenceDir, `load-baseline-${stamp}.md`);

    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(markdownPath, `${buildMarkdown(report)}\n`, 'utf8');

    process.stdout.write(`Load baseline complete. Overall: ${evaluation.overallPass ? 'PASS' : 'FAIL'}\n`);
    process.stdout.write(`Evidence JSON: ${jsonPath}\n`);
    process.stdout.write(`Evidence Markdown: ${markdownPath}\n`);

    await new Promise((resolve) => server.close(resolve));

    if (!evaluation.overallPass) {
        process.exit(1);
    }
};

run().catch(async (error) => {
    process.stderr.write(`Load baseline failed: ${error.message}\n`);
    process.exit(1);
});

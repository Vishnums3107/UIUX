/**
 * TTS Proxy Route
 * Fetches Tamil audio from Google Translate TTS server-side to avoid
 * browser CORS restrictions. Returns audio/mpeg that the frontend
 * plays via an HTML5 Audio element.
 *
 * GET /api/tts?text=வணக்கம்&lang=ta
 */
const express = require('express');
const https = require('https');
const http = require('http');

const router = express.Router();

// Simple in-memory cache to avoid repeated requests for the same text
const audioCache = new Map();
const MAX_CACHE_SIZE = 200;

/**
 * Fetch audio buffer from Google Translate TTS.
 * Returns a Promise that resolves with { buffer, contentType }.
 */
function fetchGoogleTTS(text, lang = 'ta') {
    return new Promise((resolve, reject) => {
        const encoded = encodeURIComponent(text.trim());
        const path =
            '/translate_tts?ie=UTF-8' +
            '&q=' + encoded +
            '&tl=' + lang +
            '&total=1&idx=0' +
            '&textlen=' + text.trim().length +
            '&client=tw-ob';

        const options = {
            hostname: 'translate.google.com',
            port: 443,
            path,
            method: 'GET',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://translate.google.com/',
                'Accept': 'audio/mpeg, audio/*, */*'
            }
        };

        const req = https.request(options, (res) => {
            // Follow redirects (301, 302, 307, 308)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redirectUrl = new URL(res.headers.location);
                const transport = redirectUrl.protocol === 'https:' ? https : http;

                transport.get(redirectUrl.href, {
                    headers: options.headers
                }, (redirectRes) => {
                    collectResponse(redirectRes, resolve, reject);
                }).on('error', reject);
                return;
            }

            collectResponse(res, resolve, reject);
        });

        req.on('error', reject);
        req.setTimeout(8000, () => {
            req.destroy(new Error('TTS request timed out'));
        });
        req.end();
    });
}

function collectResponse(res, resolve, reject) {
    if (res.statusCode !== 200) {
        // Consume response to free socket
        res.resume();
        return reject(new Error(`Google TTS returned status ${res.statusCode}`));
    }

    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 100) {
            return reject(new Error('TTS response too small — likely an error page'));
        }
        resolve({
            buffer,
            contentType: res.headers['content-type'] || 'audio/mpeg'
        });
    });
    res.on('error', reject);
}

router.get('/', async (req, res) => {
    const text = req.query.text;
    const lang = req.query.lang || 'ta';

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'text query parameter is required' });
    }

    // Limit text length to prevent abuse
    if (text.length > 500) {
        return res.status(400).json({ error: 'text too long (max 500 characters)' });
    }

    // Check cache
    const cacheKey = `${lang}:${text.trim()}`;
    const cached = audioCache.get(cacheKey);
    if (cached) {
        res.set('Content-Type', cached.contentType);
        res.set('Cache-Control', 'public, max-age=86400');
        res.set('X-TTS-Cache', 'hit');
        return res.send(cached.buffer);
    }

    try {
        const { buffer, contentType } = await fetchGoogleTTS(text, lang);

        // Store in cache (evict oldest if full)
        if (audioCache.size >= MAX_CACHE_SIZE) {
            const firstKey = audioCache.keys().next().value;
            audioCache.delete(firstKey);
        }
        audioCache.set(cacheKey, { buffer, contentType });

        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=86400');
        res.set('X-TTS-Cache', 'miss');
        res.send(buffer);
    } catch (err) {
        res.status(502).json({
            error: 'Failed to fetch Tamil audio',
            detail: err.message
        });
    }
});

module.exports = router;

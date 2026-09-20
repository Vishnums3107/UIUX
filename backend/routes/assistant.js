const express = require('express');
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const assistantLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many assistant requests. Please try again later.' }
});

const getReplyText = (data) => data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim();

router.post('/reply', auth, assistantLimiter, async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const pathname = typeof req.body?.pathname === 'string' ? req.body.pathname.slice(0, 160) : '/';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!query || query.length > 1000) {
        return res.status(400).json({ error: 'A question of up to 1000 characters is required.' });
    }

    if (!apiKey) {
        return res.status(503).json({ error: 'Learner assistant is not configured.' });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{
                            text: `You are a helpful learner assistant for a Tamil language learning platform. The learner is ${req.user.name || 'Learner'} and is on ${pathname}. Keep answers brief, encouraging, and focused on learning Tamil or navigating the platform. Do not use markdown formatting.`
                        }]
                    },
                    contents: [{ role: 'user', parts: [{ text: query }] }]
                })
            }
        );

        const data = await response.json();
        const reply = getReplyText(data);
        if (!response.ok || !reply) {
            logger.warn('learner_assistant_request_failed', {
                requestId: req.requestId,
                statusCode: response.status
            });
            return res.status(502).json({ error: 'Learner assistant is temporarily unavailable.' });
        }

        res.json({ reply });
    } catch (err) {
        logger.warn('learner_assistant_request_failed', {
            requestId: req.requestId,
            error: err.message
        });
        res.status(502).json({ error: 'Learner assistant is temporarily unavailable.' });
    }
});

module.exports = router;

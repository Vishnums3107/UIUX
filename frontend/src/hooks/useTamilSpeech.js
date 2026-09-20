import { useCallback, useEffect, useRef, useState } from 'react';

const CACHE_SIZE = 20;
const MAX_CHUNK_LEN = 180;
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Detect Tamil Unicode characters (U+0B80–U+0BFF).
 */
const containsTamil = (text) => /[\u0B80-\u0BFF]/.test(text);

/**
 * Build a URL to our backend TTS proxy that returns real Tamil audio
 * from Google Translate's Tamil TTS engine.
 *
 * The backend handles the Google request server-side (no CORS issues)
 * and caches results for performance.
 */
function buildTTSUrl(text, lang = 'ta') {
    const t = text.trim();
    return `${API_BASE}/tts?text=${encodeURIComponent(t)}&lang=${lang}`;
}

/**
 * Split long text into chunks ≤ maxLen characters for TTS.
 */
function chunkText(text, maxLen = MAX_CHUNK_LEN) {
    const t = text.trim();
    if (t.length <= maxLen) return [t];

    const chunks = [];
    let rem = t;
    while (rem.length > 0) {
        if (rem.length <= maxLen) { chunks.push(rem); break; }
        let i = rem.lastIndexOf('.', maxLen);
        if (i < maxLen * 0.25) i = rem.lastIndexOf(' ', maxLen);
        if (i < maxLen * 0.25) i = maxLen;
        chunks.push(rem.slice(0, i + 1).trim());
        rem = rem.slice(i + 1).trim();
    }
    return chunks.filter(Boolean);
}

export function useTamilSpeech() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recentQueueRef = useRef([]);
    const recentSetRef = useRef(new Set());
    const currentAudioRef = useRef(null);
    const chunkQueueRef = useRef([]);
    const abortedRef = useRef(false);
    const voicesReadyRef = useRef(false);
    const cachedVoicesRef = useRef({ tamil: null, english: null });

    /* ── helpers ────────────────────────────────────────────────── */

    const rememberText = useCallback((text) => {
        if (!text) return;
        const queue = recentQueueRef.current;
        const set = recentSetRef.current;
        if (set.has(text)) return;
        queue.push(text);
        set.add(text);
        if (queue.length > CACHE_SIZE) {
            const removed = queue.shift();
            set.delete(removed);
        }
    }, []);

    const resolveVoices = useCallback(() => {
        if (!('speechSynthesis' in window)) return;
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return;
        cachedVoicesRef.current.tamil =
            voices.find((v) => v.lang?.toLowerCase().startsWith('ta')) || null;
        cachedVoicesRef.current.english =
            voices.find((v) => v.lang?.toLowerCase().includes('en-us')) ||
            voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ||
            voices[0] || null;
        voicesReadyRef.current = true;
    }, []);

    useEffect(() => {
        if (!('speechSynthesis' in window)) return undefined;
        resolveVoices();
        window.speechSynthesis.onvoiceschanged = resolveVoices;
        return () => { window.speechSynthesis.onvoiceschanged = null; };
    }, [resolveVoices]);

    /* ── stop ───────────────────────────────────────────────────── */

    const stop = useCallback(() => {
        abortedRef.current = true;
        chunkQueueRef.current = [];
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            currentAudioRef.current = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    }, []);

    useEffect(() => () => stop(), [stop]);

    /* ── Play next TTS chunk via backend proxy ─────────────────── */

    const playNextChunk = useCallback((onAllDone, onError) => {
        if (abortedRef.current || chunkQueueRef.current.length === 0) {
            if (!abortedRef.current) onAllDone?.();
            return;
        }

        const chunk = chunkQueueRef.current.shift();
        const url = buildTTSUrl(chunk, 'ta');

        try {
            const audio = new Audio(url);
            currentAudioRef.current = audio;

            audio.onended = () => {
                currentAudioRef.current = null;
                playNextChunk(onAllDone, onError);
            };

            audio.onerror = () => {
                currentAudioRef.current = null;
                chunkQueueRef.current = [];
                onError?.();
            };

            audio.play().catch(() => {
                currentAudioRef.current = null;
                chunkQueueRef.current = [];
                onError?.();
            });
        } catch (_e) {
            // Audio constructor not available (e.g. test / SSR environment)
            onError?.();
        }
    }, []);

    /* ── Web Speech API fallback ────────────────────────────────── */

    const speakWithWebSpeech = useCallback(
        (text, rate, pitch, transliteration) => {
            if (!('speechSynthesis' in window)) {
                setIsSpeaking(false);
                return;
            }

            if (!voicesReadyRef.current) resolveVoices();

            const tamilVoice = cachedVoicesRef.current.tamil;
            const englishVoice = cachedVoicesRef.current.english;
            const isTamil = containsTamil(text);

            let utteranceText = text;
            let voice = tamilVoice;
            let lang = 'ta-IN';
            let spRate = rate;

            if (!tamilVoice && isTamil && transliteration) {
                utteranceText = transliteration;
                voice = englishVoice;
                lang = 'en-US';
                spRate = 0.75;
            } else if (!tamilVoice) {
                voice = englishVoice;
                lang = isTamil ? 'ta-IN' : 'en-US';
                spRate = isTamil ? 0.8 : rate;
            }

            const utterance = new SpeechSynthesisUtterance(utteranceText);
            if (voice) utterance.voice = voice;
            utterance.lang = lang;
            utterance.rate = spRate;
            utterance.pitch = pitch;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        },
        [resolveVoices],
    );

    /* ── main speak function ───────────────────────────────────── */

    /**
     * Speak Tamil text with proper native pronunciation.
     *
     * Priority:
     *   1. Backend TTS proxy → fetches real Tamil audio from Google Translate
     *   2. Browser Tamil voice → if OS has one installed
     *   3. Transliteration via English voice → last resort
     *
     * @param {string} tamilText       - Tamil script text to speak
     * @param {number} rate            - speech rate  (default 0.95)
     * @param {number} pitch           - speech pitch (default 1)
     * @param {string} transliteration - romanised pronunciation fallback
     */
    const speak = useCallback(
        (tamilText, rate = 0.95, pitch = 1, transliteration = '') => {
            const text = String(tamilText || '').trim();
            if (!text) return;

            rememberText(text);
            stop();
            abortedRef.current = false;
            setIsSpeaking(true);

            const isTamil = containsTamil(text);

            if (isTamil) {
                // ✅ Primary: real Tamil audio via backend proxy
                chunkQueueRef.current = chunkText(text);
                playNextChunk(
                    () => setIsSpeaking(false),
                    () => speakWithWebSpeech(text, rate, pitch, transliteration),
                );
                return;
            }

            // Non-Tamil text (English questions etc.)
            speakWithWebSpeech(text, rate, pitch, transliteration);
        },
        [rememberText, stop, playNextChunk, speakWithWebSpeech],
    );

    return {
        speak,
        stop,
        isSpeaking,
        recentSpoken: recentQueueRef.current,
    };
}

export default useTamilSpeech;

import { act, renderHook } from '@testing-library/react';
import { useTamilSpeech } from '../useTamilSpeech';

describe('useTamilSpeech', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'speechSynthesis', {
            configurable: true,
            value: {
                speak: vi.fn(),
                cancel: vi.fn(),
                getVoices: vi.fn(() => [{ lang: 'ta-IN', name: 'Tamil' }, { lang: 'en-US', name: 'English' }])
            }
        });
        global.SpeechSynthesisUtterance = class {
            constructor(text) {
                this.text = text;
                this.lang = '';
                this.rate = 1;
                this.pitch = 1;
                this.voice = null;
                this.onstart = null;
                this.onend = null;
                this.onerror = null;
            }
        };
        // Mock Audio to simulate Google TTS failure so fallback kicks in
        global.Audio = class {
            constructor() {
                this.src = '';
                this.onended = null;
                this.onerror = null;
            }
            play() {
                // Simulate network/audio failure → triggers Web Speech fallback
                return Promise.reject(new Error('Audio not available in test'));
            }
            pause() {}
        };
    });

    test('speak triggers browser speech API', async () => {
        const { result } = renderHook(() => useTamilSpeech());

        await act(async () => {
            result.current.speak('வணக்கம்');
            // Allow the Audio.play() rejection + fallback to resolve
            await new Promise((r) => setTimeout(r, 50));
        });

        // Google TTS fails in test → falls back to speechSynthesis
        expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
        expect(result.current.recentSpoken.length).toBeGreaterThan(0);
    });
});

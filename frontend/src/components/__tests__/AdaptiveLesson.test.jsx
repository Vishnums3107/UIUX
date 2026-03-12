import { fireEvent, render, screen } from '@testing-library/react';
import AdaptiveLesson from '../AdaptiveLesson';

const baseLesson = {
    category: 'uyir',
    difficulty: 'Beginner',
    type: 'text',
    question: 'Type the first Tamil vowel',
    question_tamil: 'முதல் உயிர் எழுத்தை தட்டச்சு செய்',
    correct_answer: 'அ',
    hint: 'It starts the vowel set.',
    explanation: 'அ is the first Tamil vowel.'
};

function renderLesson(props = {}) {
    return render(
        <AdaptiveLesson
            lesson={{ ...baseLesson, ...props.lesson }}
            level={props.level || 'Intermediate'}
            onSubmit={props.onSubmit}
            onAnswerChange={props.onAnswerChange}
            onHintUsed={props.onHintUsed}
            onError={props.onError}
            onRetry={props.onRetry}
            onActivity={props.onActivity}
            isSubmitting={props.isSubmitting || false}
            timeLeft={props.timeLeft}
        />
    );
}

describe('AdaptiveLesson UI behavior', () => {
    beforeEach(() => {
        const speak = vi.fn();
        const cancel = vi.fn();
        const getVoices = vi.fn(() => [{ lang: 'ta-IN', name: 'Tamil' }]);

        Object.defineProperty(window, 'speechSynthesis', {
            configurable: true,
            value: { speak, cancel, getVoices }
        });

        global.SpeechSynthesisUtterance = class {
            constructor(text) {
                this.text = text;
                this.lang = '';
                this.rate = 1;
                this.voice = null;
                this.onend = null;
                this.onerror = null;
            }
        };
    });

    test('intermediate mode hides hint initially and reveals it on click', () => {
        const onHintUsed = vi.fn();
        renderLesson({ level: 'Intermediate', onHintUsed });

        expect(screen.queryByText(/Hint:/i)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Show Hint/i }));

        expect(onHintUsed).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Hint:/i)).toBeInTheDocument();
    });

    test('correct submit triggers success feedback and onSubmit payload', () => {
        const onSubmit = vi.fn();
        const onAnswerChange = vi.fn();
        renderLesson({ onSubmit, onAnswerChange });

        fireEvent.change(screen.getByPlaceholderText(/Type your answer/i), { target: { value: 'அ' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

        expect(onAnswerChange).toHaveBeenCalledWith('அ');
        expect(onSubmit).toHaveBeenCalledWith({ isCorrect: true, answer: 'அ', timedOut: false });
        expect(screen.getByText(/Correct!/i)).toBeInTheDocument();
        expect(screen.getByText('அ is the first Tamil vowel.')).toBeInTheDocument();
    });

    test('incorrect submit triggers onError and retry clears feedback', () => {
        const onError = vi.fn();
        const onRetry = vi.fn();
        renderLesson({ onError, onRetry });

        fireEvent.change(screen.getByPlaceholderText(/Type your answer/i), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

        expect(onError).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/Incorrect\./i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/Incorrect\./i)).not.toBeInTheDocument();
    });

    test('uses lesson audio URL when available', async () => {
        const play = vi.fn(() => Promise.resolve());
        const pause = vi.fn();
        const audioInstance = {
            play,
            pause,
            currentTime: 0,
            onended: null,
            onerror: null
        };
        const AudioMock = vi.fn(function AudioMock(url) {
            this.src = url;
            this.play = audioInstance.play;
            this.pause = audioInstance.pause;
            this.currentTime = audioInstance.currentTime;
            this.onended = audioInstance.onended;
            this.onerror = audioInstance.onerror;
        });
        global.Audio = AudioMock;

        const onActivity = vi.fn();
        renderLesson({
            lesson: { audio_url: 'https://example.com/audio/a.mp3' },
            onActivity
        });

        fireEvent.click(screen.getByTitle(/Play pronunciation audio/i));

        expect(onActivity).toHaveBeenCalledTimes(1);
        expect(global.Audio).toHaveBeenCalledWith('https://example.com/audio/a.mp3');
        expect(play).toHaveBeenCalledTimes(1);
    });

    test('falls back to speech synthesis when no lesson audio URL is set', () => {
        const onActivity = vi.fn();
        renderLesson({ lesson: { audio_url: '' }, onActivity });

        fireEvent.click(screen.getByTitle(/Listen to Tamil pronunciation/i));

        expect(onActivity).toHaveBeenCalledTimes(1);
        expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    });
});

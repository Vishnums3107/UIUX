import { generateFluencyCertificate } from '../certificate';

describe('generateFluencyCertificate', () => {
    test('returns png data and filename for learner', () => {
        const originalCreateElement = document.createElement.bind(document);
        const fakeContext = {
            createLinearGradient: () => ({ addColorStop: vi.fn() }),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            fillText: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            set fillStyle(value) {
                this._fillStyle = value;
            },
            set strokeStyle(value) {
                this._strokeStyle = value;
            },
            set lineWidth(value) {
                this._lineWidth = value;
            },
            set font(value) {
                this._font = value;
            },
            set textAlign(value) {
                this._textAlign = value;
            }
        };

        const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
            if (tagName === 'canvas') {
                return {
                    width: 0,
                    height: 0,
                    getContext: () => fakeContext,
                    toDataURL: () => 'data:image/png;base64,abc'
                };
            }
            return originalCreateElement(tagName);
        });

        const result = generateFluencyCertificate({
            userName: 'Priya Raman',
            date: new Date('2026-03-25T00:00:00.000Z')
        });

        expect(result).not.toBeNull();
        expect(result.dataUrl.startsWith('data:image/png')).toBe(true);
        expect(result.fileName).toContain('priya-raman');
        expect(result.formattedDate).toContain('2026');

        createElementSpy.mockRestore();
    });
});
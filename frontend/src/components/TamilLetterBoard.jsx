import { useState, useMemo, useCallback } from 'react';
import useTamilSpeech from '../hooks/useTamilSpeech';

/* ═══════════════════════════════════════════════════════════════
   Tamil Letter Data
   ═══════════════════════════════════════════════════════════════ */

const UYIR = [
    { letter: 'அ', translit: 'a', phonetic: '/a/' },
    { letter: 'ஆ', translit: 'aa', phonetic: '/aː/' },
    { letter: 'இ', translit: 'i', phonetic: '/i/' },
    { letter: 'ஈ', translit: 'ii', phonetic: '/iː/' },
    { letter: 'உ', translit: 'u', phonetic: '/u/' },
    { letter: 'ஊ', translit: 'uu', phonetic: '/uː/' },
    { letter: 'எ', translit: 'e', phonetic: '/e/' },
    { letter: 'ஏ', translit: 'ee', phonetic: '/eː/' },
    { letter: 'ஐ', translit: 'ai', phonetic: '/ai/' },
    { letter: 'ஒ', translit: 'o', phonetic: '/o/' },
    { letter: 'ஓ', translit: 'oo', phonetic: '/oː/' },
    { letter: 'ஔ', translit: 'au', phonetic: '/au/' },
];

const MEI_DATA = [
    { sym: 'க்', base: 'க', translit: 'k' },
    { sym: 'ங்', base: 'ங', translit: 'ng' },
    { sym: 'ச்', base: 'ச', translit: 'ch' },
    { sym: 'ஞ்', base: 'ஞ', translit: 'nj' },
    { sym: 'ட்', base: 'ட', translit: 't' },
    { sym: 'ண்', base: 'ண', translit: 'nn' },
    { sym: 'த்', base: 'த', translit: 'th' },
    { sym: 'ந்', base: 'ந', translit: 'n' },
    { sym: 'ப்', base: 'ப', translit: 'p' },
    { sym: 'ம்', base: 'ம', translit: 'm' },
    { sym: 'ய்', base: 'ய', translit: 'y' },
    { sym: 'ர்', base: 'ர', translit: 'r' },
    { sym: 'ல்', base: 'ல', translit: 'l' },
    { sym: 'வ்', base: 'வ', translit: 'v' },
    { sym: 'ழ்', base: 'ழ', translit: 'zh' },
    { sym: 'ள்', base: 'ள', translit: 'll' },
    { sym: 'ற்', base: 'ற', translit: 'rr' },
    { sym: 'ன்', base: 'ன', translit: 'n2' },
];

const VOWEL_SIGNS = {
    a: '', aa: 'ா', i: 'ி', ii: 'ீ', u: 'ு', uu: 'ூ',
    e: 'ெ', ee: 'ே', ai: 'ை', o: 'ொ', oo: 'ோ', au: 'ௌ'
};

const VOWEL_KEYS = ['a', 'aa', 'i', 'ii', 'u', 'uu', 'e', 'ee', 'ai', 'o', 'oo', 'au'];

const TABS = [
    { id: 'uyir', label: 'உயிர்', en: 'Vowels', icon: '🔤', count: 12 },
    { id: 'mei', label: 'மெய்', en: 'Consonants', icon: '🔡', count: 18 },
    { id: 'uyirmei', label: 'உயிர்மெய்', en: 'Combined', icon: '✏️', count: '216' },
];

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export default function TamilLetterBoard() {
    const { speak, stop, isSpeaking } = useTamilSpeech();
    const [activeTab, setActiveTab] = useState('uyir');
    const [activeLetter, setActiveLetter] = useState(null);
    const [selectedMeiRow, setSelectedMeiRow] = useState(null);

    // Build Uyirmei grid for a specific consonant
    const uyirmeiRow = useMemo(() => {
        if (!selectedMeiRow) return [];
        const base = selectedMeiRow.base;
        return VOWEL_KEYS.map((key) => ({
            letter: `${base}${VOWEL_SIGNS[key]}`,
            translit: `${selectedMeiRow.translit}${key}`,
        }));
    }, [selectedMeiRow]);

    const handleLetterClick = useCallback((letter, translit) => {
        setActiveLetter(letter);
        if (isSpeaking) {
            stop();
        }
        // Speak the Tamil letter using the TTS proxy
        speak(letter, 0.85, 1, translit);
    }, [speak, stop, isSpeaking]);

    const handleMeiRowSelect = useCallback((mei) => {
        setSelectedMeiRow((prev) => (prev?.sym === mei.sym ? null : mei));
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 animate-fade-in">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-100 font-tamil">
                    தமிழ் எழுத்துக்கள்
                </h1>
                <p className="text-gray-400 mt-2 text-lg">
                    Tamil Letters — Click any letter to hear its pronunciation
                </p>
                <p className="text-gray-500 mt-1 text-sm italic">
                    எழுத்தை சொடுக்கினால் ஒலிக்கும்
                </p>
            </div>

            {/* Active Letter Display */}
            {activeLetter && (
                <div className="mb-8 flex justify-center animate-fade-in">
                    <div className="relative px-10 py-6 rounded-3xl border border-ocean-400/30 bg-gradient-to-br from-ocean-500/15 to-tamil-500/10 backdrop-blur-sm shadow-xl shadow-ocean-900/20 text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-ocean-300 mb-2">Now Playing</p>
                        <p className="text-7xl font-bold font-tamil text-white leading-none mb-2">{activeLetter}</p>
                        {isSpeaking && (
                            <div className="flex items-center justify-center gap-1 mt-3">
                                <span className="inline-block w-1 h-4 bg-ocean-400 rounded-full animate-pulse" />
                                <span className="inline-block w-1 h-6 bg-ocean-300 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                                <span className="inline-block w-1 h-5 bg-ocean-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                                <span className="inline-block w-1 h-3 bg-ocean-300 rounded-full animate-pulse" style={{ animationDelay: '0.45s' }} />
                                <span className="inline-block w-1 h-5 bg-ocean-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-8">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                            setActiveTab(tab.id);
                            setActiveLetter(null);
                            setSelectedMeiRow(null);
                        }}
                        className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 border ${
                            activeTab === tab.id
                                ? 'border-ocean-400/60 bg-ocean-500/20 text-white shadow-lg shadow-ocean-900/20 scale-105'
                                : 'border-white/10 bg-white/5 text-gray-400 hover:text-gray-200 hover:border-ocean-400/30 hover:bg-ocean-500/8'
                        }`}
                    >
                        <span className="mr-1.5">{tab.icon}</span>
                        <span className="font-tamil">{tab.label}</span>
                        <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
                    </button>
                ))}
            </div>

            {/* ── Uyir (Vowels) Grid ───────────────────────────── */}
            {activeTab === 'uyir' && (
                <div>
                    <div className="text-center mb-5">
                        <h2 className="text-xl font-bold text-gray-200">
                            <span className="font-tamil">உயிர் எழுத்துக்கள்</span>
                            <span className="text-gray-500 text-base ml-2">— 12 Vowels</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3">
                        {UYIR.map((v) => (
                            <button
                                key={v.letter}
                                type="button"
                                onClick={() => handleLetterClick(v.letter, v.translit)}
                                className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-ocean-500/20 active:scale-95 ${
                                    activeLetter === v.letter
                                        ? 'border-ocean-400/60 bg-ocean-500/25 ring-2 ring-ocean-400/40 shadow-xl'
                                        : 'border-white/10 bg-white/5 hover:border-ocean-400/40 hover:bg-ocean-500/10'
                                }`}
                            >
                                <span className="text-3xl font-bold font-tamil text-white group-hover:text-ocean-200 transition-colors">
                                    {v.letter}
                                </span>
                                <span className="text-xs text-gray-500 mt-1.5 group-hover:text-ocean-300 transition-colors">
                                    {v.translit}
                                </span>
                                {/* Speaker overlay on hover */}
                                <span className="absolute top-1 right-1.5 text-xs opacity-0 group-hover:opacity-60 transition-opacity">
                                    🔈
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Mei (Consonants) Grid ────────────────────────── */}
            {activeTab === 'mei' && (
                <div>
                    <div className="text-center mb-5">
                        <h2 className="text-xl font-bold text-gray-200">
                            <span className="font-tamil">மெய் எழுத்துக்கள்</span>
                            <span className="text-gray-500 text-base ml-2">— 18 Consonants</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-3">
                        {MEI_DATA.map((m) => (
                            <button
                                key={m.sym}
                                type="button"
                                onClick={() => handleLetterClick(m.sym, m.translit)}
                                className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 ${
                                    activeLetter === m.sym
                                        ? 'border-emerald-400/60 bg-emerald-500/25 ring-2 ring-emerald-400/40 shadow-xl'
                                        : 'border-white/10 bg-white/5 hover:border-emerald-400/40 hover:bg-emerald-500/10'
                                }`}
                            >
                                <span className="text-3xl font-bold font-tamil text-white group-hover:text-emerald-200 transition-colors">
                                    {m.sym}
                                </span>
                                <span className="text-xs text-gray-500 mt-1.5 group-hover:text-emerald-300 transition-colors">
                                    {m.translit}
                                </span>
                                <span className="absolute top-1 right-1.5 text-xs opacity-0 group-hover:opacity-60 transition-opacity">
                                    🔈
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Uyirmei (Combined Letters) ───────────────────── */}
            {activeTab === 'uyirmei' && (
                <div>
                    <div className="text-center mb-5">
                        <h2 className="text-xl font-bold text-gray-200">
                            <span className="font-tamil">உயிர்மெய் எழுத்துக்கள்</span>
                            <span className="text-gray-500 text-base ml-2">— 216 Combined Letters</span>
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Select a consonant to see its vowel combinations</p>
                    </div>

                    {/* Consonant selector row */}
                    <div className="grid grid-cols-6 sm:grid-cols-9 lg:grid-cols-18 gap-2 mb-6">
                        {MEI_DATA.map((m) => (
                            <button
                                key={`uyirmei-base-${m.sym}`}
                                type="button"
                                onClick={() => handleMeiRowSelect(m)}
                                className={`flex flex-col items-center py-2.5 px-2 rounded-xl border text-sm font-bold transition-all duration-200 hover:scale-105 ${
                                    selectedMeiRow?.sym === m.sym
                                        ? 'border-amber-400/60 bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40'
                                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-amber-400/30 hover:text-amber-300'
                                }`}
                            >
                                <span className="font-tamil text-lg">{m.base}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5">{m.translit}</span>
                            </button>
                        ))}
                    </div>

                    {/* Uyirmei grid for selected consonant */}
                    {selectedMeiRow ? (
                        <div className="animate-fade-in">
                            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl font-tamil font-bold text-amber-200">{selectedMeiRow.base}</span>
                                    <div>
                                        <p className="text-amber-300 font-semibold">{selectedMeiRow.translit} + vowels</p>
                                        <p className="text-gray-500 text-xs">Click any combined letter to hear it</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3">
                                    {uyirmeiRow.map((combo) => (
                                        <button
                                            key={combo.letter}
                                            type="button"
                                            onClick={() => handleLetterClick(combo.letter, combo.translit)}
                                            className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 ${
                                                activeLetter === combo.letter
                                                    ? 'border-amber-400/60 bg-amber-500/25 ring-2 ring-amber-400/40 shadow-xl'
                                                    : 'border-white/10 bg-white/5 hover:border-amber-400/40 hover:bg-amber-500/10'
                                            }`}
                                        >
                                            <span className="text-2xl font-bold font-tamil text-white group-hover:text-amber-200 transition-colors">
                                                {combo.letter}
                                            </span>
                                            <span className="text-[10px] text-gray-500 mt-1 group-hover:text-amber-300 transition-colors">
                                                {combo.translit}
                                            </span>
                                            <span className="absolute top-0.5 right-1 text-xs opacity-0 group-hover:opacity-60 transition-opacity">
                                                🔈
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16 rounded-2xl border border-white/5 bg-white/3">
                            <p className="text-5xl mb-4">👆</p>
                            <p className="text-gray-400 text-lg">Select a consonant above to view its vowel combinations</p>
                            <p className="text-gray-600 text-sm mt-1 font-tamil">மேலே ஒரு மெய் எழுத்தை தேர்வு செய்யவும்</p>
                        </div>
                    )}

                    {/* Quick full grid — all 18 consonants' first vowel combos */}
                    <div className="mt-8">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-gray-500 mb-4">
                            Full Grid Preview — Base Forms (consonant + அ)
                        </h3>
                        <div className="grid grid-cols-6 sm:grid-cols-9 lg:grid-cols-18 gap-2">
                            {MEI_DATA.map((m) => {
                                const baseForm = `${m.base}`;
                                return (
                                    <button
                                        key={`base-preview-${m.sym}`}
                                        type="button"
                                        onClick={() => handleLetterClick(baseForm, m.translit + 'a')}
                                        className="flex flex-col items-center p-2 rounded-xl border border-white/5 bg-white/3 hover:bg-amber-500/10 hover:border-amber-400/30 transition-all text-gray-300 hover:text-amber-200"
                                    >
                                        <span className="font-tamil text-lg font-bold">{baseForm}</span>
                                        <span className="text-[9px] text-gray-600">{m.translit}a</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Special character: Aytham */}
            <div className="mt-10 text-center">
                <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-white/5">
                    <button
                        type="button"
                        onClick={() => handleLetterClick('ஃ', 'aḵ')}
                        className="text-3xl font-tamil font-bold text-gray-300 hover:text-ocean-200 transition-colors hover:scale-110 active:scale-95"
                    >
                        ஃ
                    </button>
                    <div className="text-left">
                        <p className="text-gray-400 text-sm font-semibold">ஆய்த எழுத்து (Aytham)</p>
                        <p className="text-gray-600 text-xs">Special character — the only letter outside the three categories</p>
                    </div>
                </div>
            </div>

            {/* Stats footer */}
            <div className="mt-10 flex justify-center gap-6 text-center text-sm text-gray-600">
                <div className="px-4 py-2 rounded-xl border border-white/5 bg-white/3">
                    <p className="text-2xl font-bold text-ocean-300">12</p>
                    <p>உயிர் (Vowels)</p>
                </div>
                <div className="px-4 py-2 rounded-xl border border-white/5 bg-white/3">
                    <p className="text-2xl font-bold text-emerald-300">18</p>
                    <p>மெய் (Consonants)</p>
                </div>
                <div className="px-4 py-2 rounded-xl border border-white/5 bg-white/3">
                    <p className="text-2xl font-bold text-amber-300">216</p>
                    <p>உயிர்மெய் (Combined)</p>
                </div>
                <div className="px-4 py-2 rounded-xl border border-white/5 bg-white/3">
                    <p className="text-2xl font-bold text-gray-300">1</p>
                    <p>ஆய்தம் (Special)</p>
                </div>
            </div>
        </div>
    );
}

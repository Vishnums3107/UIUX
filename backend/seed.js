/**
 * Database Seed Script
 * Generates the full 10-stage Tamil fluency curriculum (333 lessons).
 * Run: node seed.js
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Lesson = require('./models/Lesson');

const MCQ_EXERCISE_TYPES = new Set([
    'audio_mcq',
    'image_mcq',
    'text_mcq',
    'role_play_mcq',
    'comprehension_mcq',
    'true_false'
]);

const VOWELS = [
    ['அ', 'a', '/a/'],
    ['ஆ', 'aa', '/aː/'],
    ['இ', 'i', '/i/'],
    ['ஈ', 'ii', '/iː/'],
    ['உ', 'u', '/u/'],
    ['ஊ', 'uu', '/uː/'],
    ['எ', 'e', '/e/'],
    ['ஏ', 'ee', '/eː/'],
    ['ஐ', 'ai', '/ai/'],
    ['ஒ', 'o', '/o/'],
    ['ஓ', 'oo', '/oː/'],
    ['ஔ', 'au', '/au/']
];

const VOWEL_SIGNS = { a: '', aa: 'ா', i: 'ி', ii: 'ீ', u: 'ு', uu: 'ூ', e: 'ெ', ee: 'ே', ai: 'ை', o: 'ொ', oo: 'ோ', au: 'ௌ' };

const CONSONANTS = [
    ['க்', 'க', 'k', '/k/'], ['ங்', 'ங', 'ng', '/ŋ/'], ['ச்', 'ச', 'c', '/t͡ʃ/'], ['ஞ்', 'ஞ', 'nj', '/ɲ/'],
    ['ட்', 'ட', 't', '/ʈ/'], ['ண்', 'ண', 'nn', '/ɳ/'], ['த்', 'த', 'th', '/t̪/'], ['ந்', 'ந', 'n', '/n̪/'],
    ['ப்', 'ப', 'p', '/p/'], ['ம்', 'ம', 'm', '/m/'], ['ய்', 'ய', 'y', '/j/'], ['ர்', 'ர', 'r', '/r/'],
    ['ல்', 'ல', 'l', '/l/'], ['வ்', 'வ', 'v', '/ʋ/'], ['ழ்', 'ழ', 'zh', '/ɻ/'], ['ள்', 'ள', 'll', '/ɭ/'],
    ['ற்', 'ற', 'rr', '/r̠/'], ['ன்', 'ன', 'n2', '/n/']
];

const VOCAB_SETS = [
    ['Body parts', 'உடல் உறுப்புகள்', [
        ['கண்', 'eye', 'kan'], ['கை', 'hand', 'kai'], ['காது', 'ear', 'kaadhu'], ['மூக்கு', 'nose', 'mookku'], ['வாய்', 'mouth', 'vaai'],
        ['பல்', 'tooth', 'pal'], ['கால்', 'leg', 'kaal'], ['முடி', 'hair', 'mudi'], ['முகம்', 'face', 'mugam'], ['விரல்', 'finger', 'viral'],
        ['தலை', 'head', 'thalai'], ['தோள்', 'shoulder', 'thol'], ['முழங்கை', 'elbow', 'muzhangai'], ['வயிறு', 'stomach', 'vayiru'], ['முதுகு', 'back', 'muthugu'],
        ['நகம்', 'nail', 'nagam'], ['நாக்கு', 'tongue', 'naakku'], ['இதயம்', 'heart', 'idhayam'], ['மூளை', 'brain', 'moolai'], ['புருவம்', 'eyebrow', 'puruvam']
    ]],
    ['Family', 'குடும்பம்', [
        ['அம்மா', 'mother', 'ammaa'], ['அப்பா', 'father', 'appaa'], ['அண்ணன்', 'elder brother', 'annan'], ['அக்கா', 'elder sister', 'akkaa'], ['தம்பி', 'younger brother', 'thambi'],
        ['தங்கை', 'younger sister', 'thangai'], ['மகன்', 'son', 'magan'], ['மகள்', 'daughter', 'magal'], ['தாத்தா', 'grandfather', 'thaathaa'], ['பாட்டி', 'grandmother', 'paatti'],
        ['மாமா', 'uncle', 'maamaa'], ['மாமி', 'aunt', 'maami'], ['சித்தப்பா', 'uncle', 'chiththappaa'], ['சித்தி', 'aunt', 'chithi'], ['கணவர்', 'husband', 'kanavar'],
        ['மனைவி', 'wife', 'manaivi'], ['பேரன்', 'grandson', 'peran'], ['பேத்தி', 'granddaughter', 'paethi'], ['மருமகன்', 'son-in-law', 'marumagan'], ['மருமகள்', 'daughter-in-law', 'marumagal']
    ]],
    ['Food & Drink', 'உணவு', [
        ['சோறு', 'rice meal', 'sooru'], ['தண்ணீர்', 'water', 'thanneer'], ['பால்', 'milk', 'paal'], ['இட்லி', 'idli', 'idli'], ['தோசை', 'dosa', 'dosai'],
        ['சாம்பார்', 'sambar', 'saambaar'], ['ரசம்', 'rasam', 'rasam'], ['தேநீர்', 'tea', 'theneer'], ['காபி', 'coffee', 'kaapi'], ['பழம்', 'fruit', 'pazham'],
        ['சாதம்', 'cooked rice', 'saadham'], ['குழம்பு', 'curry', 'kuzhambu'], ['பொங்கல்', 'pongal', 'pongal'], ['சப்பாத்தி', 'chapati', 'chappaathi'], ['பரோட்டா', 'parotta', 'parotta'],
        ['ஊறுகாய்', 'pickle', 'oorugai'], ['தயிர்', 'curd', 'thayir'], ['இனிப்பு', 'sweet', 'inippu'], ['காரம்', 'spice', 'kaaram'], ['முட்டை', 'egg', 'muttai']
    ]],
    ['Colours & Shapes', 'நிறங்கள்', [
        ['சிவப்பு', 'red', 'sivappu'], ['நீலம்', 'blue', 'neelam'], ['பச்சை', 'green', 'pachchai'], ['மஞ்சள்', 'yellow', 'manjal'], ['கருப்பு', 'black', 'karuppu'],
        ['வெள்ளை', 'white', 'vellai'], ['வட்டம்', 'circle', 'vattam'], ['சதுரம்', 'square', 'sathuram'], ['முக்கோணம்', 'triangle', 'mukkoanam'], ['நீளவடிவு', 'rectangle', 'neelavadivu'],
        ['ஆரஞ்சு', 'orange', 'aaranju'], ['ஊதா', 'violet', 'oodhaa'], ['பழுப்பு', 'brown', 'pazhuppu'], ['சாம்பல்', 'gray', 'saambal'], ['இளஞ்சிவப்பு', 'pink', 'ilanchivappu'],
        ['கோடு', 'line', 'kodu'], ['புள்ளி', 'dot', 'pulli'], ['ஓவல்', 'oval', 'oval'], ['கனசதுரம்', 'cube', 'kanasathuram'], ['உருளை', 'cylinder', 'urulai']
    ]],
    ['Animals', 'விலங்குகள்', [
        ['நாய்', 'dog', 'naai'], ['பூனை', 'cat', 'poonai'], ['மாடு', 'cow', 'maadu'], ['ஆடு', 'goat', 'aadu'], ['கோழி', 'chicken', 'kozhi'],
        ['குதிரை', 'horse', 'kuthirai'], ['யானை', 'elephant', 'yaanai'], ['புலி', 'tiger', 'puli'], ['மீன்', 'fish', 'meen'], ['குரங்கு', 'monkey', 'kurangu'],
        ['எருமை', 'buffalo', 'erumai'], ['முயல்', 'rabbit', 'muyal'], ['சிங்கம்', 'lion', 'singam'], ['கரடி', 'bear', 'karadi'], ['மான்', 'deer', 'maan'],
        ['நரி', 'fox', 'nari'], ['ஒட்டகம்', 'camel', 'ottagam'], ['பன்றி', 'pig', 'panri'], ['கிளி', 'parrot', 'kili'], ['பாம்பு', 'snake', 'paambu']
    ]],
    ['Home & Objects', 'வீடு', [
        ['வீடு', 'house', 'veedu'], ['கதவு', 'door', 'kathavu'], ['ஜன்னல்', 'window', 'jannal'], ['மேஜை', 'table', 'mejai'], ['நாற்காலி', 'chair', 'naarkaali'],
        ['படுக்கை', 'bed', 'padukkai'], ['விளக்கு', 'lamp', 'vilakku'], ['கிண்ணம்', 'bowl', 'kinnam'], ['கோப்பை', 'cup', 'koppai'], ['சாவி', 'key', 'saavi'],
        ['அலமாரி', 'cupboard', 'alamaari'], ['கண்ணாடி', 'mirror', 'kannaadi'], ['கடிகாரம்', 'clock', 'kadigaaram'], ['தட்டு', 'plate', 'thattu'], ['கரண்டி', 'spoon', 'karandi'],
        ['பை', 'bag', 'pai'], ['புத்தகம்', 'book', 'puthagam'], ['பேனா', 'pen', 'pena'], ['தலையணை', 'pillow', 'thalaiyanai'], ['போர்வை', 'blanket', 'porvai']
    ]],
    ['Nature & Weather', 'இயற்கை', [
        ['மழை', 'rain', 'mazhai'], ['காற்று', 'wind', 'kaatru'], ['சூரியன்', 'sun', 'sooriyan'], ['நிலா', 'moon', 'nilaa'], ['மேகம்', 'cloud', 'megam'],
        ['மரம்', 'tree', 'maram'], ['மலர்', 'flower', 'malar'], ['நதி', 'river', 'nadhi'], ['கடல்', 'sea', 'kadal'], ['மலை', 'hill', 'malai'],
        ['மண்', 'soil', 'mann'], ['கல்', 'stone', 'kal'], ['இடி', 'thunder', 'idi'], ['மின்னல்', 'lightning', 'minnal'], ['பனி', 'dew', 'pani'],
        ['வெயில்', 'sunlight', 'veyil'], ['ஓடை', 'stream', 'odai'], ['பூமி', 'earth', 'boomi'], ['காடு', 'forest', 'kaadu'], ['மணல்வெளி', 'desert', 'manalveli']
    ]],
    ['Transport', 'போக்குவரத்து', [
        ['பஸ்', 'bus', 'bas'], ['ரயில்', 'train', 'rayil'], ['கார்', 'car', 'kaar'], ['சைக்கிள்', 'bicycle', 'saikkil'], ['ஆட்டோ', 'auto-rickshaw', 'aatto'],
        ['லாரி', 'lorry', 'laari'], ['விமானம்', 'airplane', 'vimaanam'], ['கப்பல்', 'ship', 'kappal'], ['மோட்டார் சைக்கிள்', 'motorcycle', 'mottar saikkil'], ['நிலையம்', 'station', 'nilaiyam'],
        ['மெட்ரோ', 'metro', 'metro'], ['டாக்சி', 'taxi', 'taaksi'], ['வேன்', 'van', 'ven'], ['படகு', 'boat', 'padagu'], ['ஹெலிகாப்டர்', 'helicopter', 'helikaptar'],
        ['சாலை', 'road', 'saalai'], ['பாலம்', 'bridge', 'paalam'], ['டிக்கெட்', 'ticket', 'tikket'], ['பயணி', 'passenger', 'payani'], ['ஓட்டுநர்', 'driver', 'oattunar']
    ]],
    ['Emotions', 'உணர்வுகள்', [
        ['மகிழ்ச்சி', 'happiness', 'magizhchi'], ['சோகம்', 'sadness', 'sogam'], ['கோபம்', 'anger', 'kobam'], ['பயம்', 'fear', 'bayam'], ['ஆச்சரியம்', 'surprise', 'aachariyam'],
        ['அன்பு', 'love', 'anbu'], ['கவலை', 'worry', 'kavalai'], ['நம்பிக்கை', 'hope', 'nambikkai'], ['அமைதி', 'calmness', 'amaidhi'], ['பெருமை', 'pride', 'perumai'],
        ['உற்சாகம்', 'excitement', 'urchaagam'], ['வெட்கம்', 'shyness', 'vetkam'], ['பொறாமை', 'jealousy', 'poraamai'], ['திருப்தி', 'satisfaction', 'thirupthi'], ['சோர்வு', 'tiredness', 'sorvu'],
        ['நன்றியுணர்வு', 'gratitude', 'nandriyunarvu'], ['ஆர்வம்', 'interest', 'aarvam'], ['குழப்பம்', 'confusion', 'kuzhappam'], ['ஏமாற்றம்', 'disappointment', 'emaatram'], ['தைரியம்', 'courage', 'thairiyam']
    ]],
    ['Common Verbs', 'வினைச்சொற்கள்', [
        ['சாப்பிடு', 'eat', 'saappidu'], ['குடி', 'drink', 'kudi'], ['பேசு', 'speak', 'pesu'], ['பார்', 'watch', 'paar'], ['கேள்', 'listen', 'kel'],
        ['போ', 'go', 'po'], ['வா', 'come', 'vaa'], ['எழுது', 'write', 'ezhuthu'], ['படி', 'study', 'padi'], ['தூங்கு', 'sleep', 'thoongu'],
        ['நட', 'walk', 'nada'], ['ஓடு', 'run', 'odu'], ['சிரி', 'laugh', 'siri'], ['அழு', 'cry', 'azhu'], ['வேலைசெய்', 'work', 'velaisey'],
        ['விளையாடு', 'play', 'vilaiyaadu'], ['வாங்கு', 'buy', 'vaangu'], ['விற்கு', 'sell', 'virkku'], ['திற', 'open', 'thira'], ['மூடு', 'close', 'moodu']
    ]]
];

const categoryForStage = (stage) => {
    if (stage === 1) return 'uyir';
    if (stage === 2) return 'mei';
    if (stage === 3) return 'uyir-mei';
    if (stage <= 6) return 'grammar';
    return 'sentences';
};

const normalizeNFC = (value) => {
    if (typeof value === 'string') return value.normalize('NFC');
    if (Array.isArray(value)) return value.map(normalizeNFC);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeNFC(v)]));
    }
    return value;
};

const bilingual = (en, ta) => `EN: ${en} | தமிழ்: ${ta}`;
const inferLegacyType = (exerciseType) => (MCQ_EXERCISE_TYPES.has(exerciseType) ? 'mcq' : 'text');
const buildUyirmei = (base, vowelKey) => `${base}${VOWEL_SIGNS[vowelKey] || ''}`;

const withFourOptions = (options, correct) => {
    const out = Array.isArray(options) ? [...options] : [];
    if (!out.includes(correct)) out.unshift(correct);
    while (out.length < 4) out.push(`${correct}${out.length}`);
    return out.slice(0, 4);
};

const cycleWindow = (items, start, size = 4) => Array.from(
    { length: size },
    (_, idx) => items[(start + idx) % items.length]
);

const makeLesson = ({
    stage,
    stageOrder,
    category = categoryForStage(stage),
    difficulty,
    question,
    questionTamil = '',
    exerciseType = 'text_mcq',
    options = [],
    correctAnswer = '',
    explanation = '',
    hint = '',
    transliteration = '',
    tamilScript = '',
    phonetic = '/ta/',
    audioKey = '',
    imageAlt = '',
    dragItems = [],
    dragTargets = [],
    sentenceParts = [],
    correctOrder = [],
    passage = '',
    passageTitle = '',
    writingPrompt = '',
    modelAnswer = '',
    acceptedAnswers = [],
    questions = [],
    isMasteryTest = false,
    unlocksStage,
    culturalNote = ''
}) => {
    const finalDifficulty = difficulty || (stageOrder === 1 ? 'Beginner' : stageOrder % 3 === 0 ? 'Advanced' : 'Intermediate');
    const type = inferLegacyType(exerciseType);
    const finalAnswer = correctAnswer || modelAnswer || '';
    const finalModelAnswer = modelAnswer || (stage === 9 ? finalAnswer : '');
    const finalAcceptedAnswers = Array.isArray(acceptedAnswers) && acceptedAnswers.length
        ? acceptedAnswers
        : stage === 9 && finalModelAnswer
            ? [finalModelAnswer, finalModelAnswer]
            : [];

    return normalizeNFC({
        category,
        difficulty: finalDifficulty,
        type,
        question,
        question_tamil: questionTamil,
        questionType: exerciseType,
        options: type === 'mcq' ? withFourOptions(options, finalAnswer) : options,
        correct_answer: finalAnswer,
        explanation,
        hint,
        transliteration,
        tamilScript: tamilScript || finalAnswer,
        phonetic,
        order: stageOrder,
        correctAnswer: finalAnswer,
        stage,
        stageOrder,
        exerciseType,
        audio_url: audioKey,
        audioKey,
        imageAlt,
        dragItems,
        dragTargets,
        sentenceParts,
        correctOrder,
        passage,
        passageTitle,
        writingPrompt,
        modelAnswer: finalModelAnswer,
        acceptedAnswers: finalAcceptedAnswers,
        questions,
        isMasteryTest,
        unlocksStage,
        culturalNote
    });
};

const buildStage1 = () => {
    const lessons = [];
    let n = 1;
    VOWELS.forEach(([ta, tr, ipa], i) => {
        const opts = [ta, VOWELS[(i + 1) % 12][0], VOWELS[(i + 2) % 12][0], VOWELS[(i + 3) % 12][0]];
        lessons.push(makeLesson({
            stage: 1, stageOrder: n++, difficulty: n === 2 ? 'Beginner' : undefined, exerciseType: 'image_mcq',
            question: `Identify vowel "${tr}"`, questionTamil: `"${tr}" ஒலிக்கு உயிரை தேர்வு செய்`, options: opts, correctAnswer: ta,
            hint: bilingual('Match the vowel shape.', 'உயிர் வடிவத்தை கவனியுங்கள்.'),
            explanation: bilingual(`Correct vowel is ${ta}.`, `சரியான உயிர் ${ta}.`),
            transliteration: tr, tamilScript: ta, phonetic: ipa, audioKey: ta, imageAlt: `Tamil vowel ${ta}`
        }));
        lessons.push(makeLesson({
            stage: 1, stageOrder: n++, exerciseType: 'audio_mcq',
            question: `Hear and choose "${tr}"`, questionTamil: `ஒலி கேட்டு "${tr}" உயிரை தேர்வு செய்`, options: opts, correctAnswer: ta,
            hint: bilingual('Replay audio and compare options.', 'ஒலியை மீண்டும் கேட்டு ஒப்பிடுங்கள்.'),
            explanation: bilingual(`Audio maps to ${ta}.`, `கேட்ட ஒலி ${ta} உயிருக்கு பொருந்தும்.`),
            transliteration: tr, tamilScript: ta, phonetic: ipa, audioKey: ta
        }));
        lessons.push(makeLesson({
            stage: 1, stageOrder: n++, exerciseType: 'trace_type',
            question: `Type vowel "${tr}"`, questionTamil: `"${tr}" உயிரை தட்டச்சு செய்`, correctAnswer: ta,
            modelAnswer: ta, acceptedAnswers: [ta, ta],
            hint: bilingual('Type one Tamil character.', 'ஒரு தமிழ் எழுத்தை மட்டும் தட்டச்சு செய்.'),
            explanation: bilingual(`The correct symbol is ${ta}.`, `சரியான எழுத்து ${ta}.`),
            transliteration: tr, tamilScript: ta, phonetic: ipa, audioKey: ta
        }));
    });
    return lessons;
};

const buildStage2 = () => {
    const lessons = [];
    let n = 1;
    CONSONANTS.forEach(([sym, base, tr, ipa], i) => {
        const opts = [sym, CONSONANTS[(i + 1) % 18][0], CONSONANTS[(i + 2) % 18][0], CONSONANTS[(i + 3) % 18][0]];
        lessons.push(makeLesson({
            stage: 2, stageOrder: n++, difficulty: n === 2 ? 'Beginner' : undefined, exerciseType: 'flashcard',
            question: `Study consonant ${sym}`, questionTamil: `${sym} மெய்யை நினைவில் கொள்`, correctAnswer: sym,
            hint: bilingual('Flip and read transliteration.', 'ஒலிபெயர்ப்பை படித்து மனப்பாடம் செய்.'),
            explanation: bilingual(`${sym} is transliterated as ${tr}.`, `${sym} மெய் ${tr} என ஒலிபெயர்க்கப்படும்.`),
            transliteration: tr, tamilScript: sym, phonetic: ipa, audioKey: base
        }));
        lessons.push(makeLesson({
            stage: 2, stageOrder: n++, exerciseType: 'fill_blank',
            question: `Fill: _ = "${tr}"`, questionTamil: `காலி இடம்: _ = "${tr}"`, options: opts, correctAnswer: sym,
            hint: bilingual('Pick the matching consonant.', 'பொருந்தும் மெய்யை தேர்வு செய்.'),
            explanation: bilingual(`${sym} is the expected consonant.`, `${sym} தான் எதிர்பார்க்கும் மெய்.`),
            transliteration: tr, tamilScript: sym, phonetic: ipa, audioKey: base
        }));
    });
    return lessons;
};

const buildStage3 = () => {
    const lessons = [];
    let n = 1;
    CONSONANTS.forEach(([sym, base, tr, ipa], i) => {
        const [vTa, vTr, vIpa] = VOWELS[i % 12];
        const combo = buildUyirmei(base, vTr);
        const opts = [
            combo,
            buildUyirmei(base, VOWELS[(i + 1) % 12][1]),
            buildUyirmei(base, VOWELS[(i + 2) % 12][1]),
            buildUyirmei(base, VOWELS[(i + 3) % 12][1])
        ];
        lessons.push(makeLesson({
            stage: 3, stageOrder: n++, difficulty: n === 2 ? 'Beginner' : undefined, exerciseType: 'audio_mcq',
            question: `Choose combo ${tr}+${vTr}`, questionTamil: `${tr}+${vTr} க்கு உயிர்மெய் தேர்வு செய்`,
            options: opts, correctAnswer: combo,
            hint: bilingual('Consonant stays same, only vowel sign changes.', 'மெய் அதே; உயிர் குறி மட்டும் மாறும்.'),
            explanation: bilingual(`Correct combo is ${combo}.`, `சரியான உயிர்மெய் ${combo}.`),
            transliteration: `${tr}${vTr}`, tamilScript: combo, phonetic: `${ipa}${vIpa}`, audioKey: combo
        }));
        lessons.push(makeLesson({
            stage: 3, stageOrder: n++, exerciseType: 'text_mcq',
            question: `Which vowel in ${combo}?`, questionTamil: `${combo} எழுத்தில் எந்த உயிர்?`,
            options: [vTa, VOWELS[(i + 1) % 12][0], VOWELS[(i + 2) % 12][0], VOWELS[(i + 3) % 12][0]],
            correctAnswer: vTa,
            hint: bilingual('Read the vowel marker.', 'உயிர் குறியை வாசி.'),
            explanation: bilingual(`Vowel is ${vTa}.`, `உயிர் ${vTa}.`),
            transliteration: `${tr}${vTr}`, tamilScript: combo, phonetic: `${ipa}${vIpa}`
        }));
        const odd = buildUyirmei(CONSONANTS[(i + 1) % 18][1], vTr);
        if (i === CONSONANTS.length - 1) {
            const speedQuestions = Array.from({ length: 10 }, (_, qIndex) => {
                const localVowel = VOWELS[(i + qIndex) % 12];
                const correctCombo = buildUyirmei(base, localVowel[1]);
                const distractors = [
                    buildUyirmei(base, VOWELS[(i + qIndex + 1) % 12][1]),
                    buildUyirmei(base, VOWELS[(i + qIndex + 2) % 12][1]),
                    buildUyirmei(CONSONANTS[(i + qIndex + 1) % 18][1], localVowel[1])
                ];
                return {
                    question: `Pick ${tr}+${localVowel[1]}`,
                    questionTamil: `${tr}+${localVowel[1]} உயிர்மெய் தேர்வு செய்`,
                    options: [correctCombo, ...distractors],
                    correctAnswer: correctCombo,
                    exerciseType: 'text_mcq',
                    transliteration: `${tr}${localVowel[1]}`
                };
            });

            lessons.push(makeLesson({
                stage: 3,
                stageOrder: n++,
                exerciseType: 'speed_round',
                question: 'Uyirmei speed round',
                questionTamil: 'உயிர்மெய் வேகப் பயிற்சி',
                correctAnswer: 'speed',
                hint: bilingual('Answer quickly and watch consonant-vowel patterns.', 'வேகமாக பதில் அளித்து மெய்-உயிர் வடிவத்தை கவனி.'),
                explanation: bilingual('Speed drills improve rapid script recognition.', 'வேகப் பயிற்சி எழுத்து அடையாள வேகத்தை மேம்படுத்தும்.'),
                transliteration: tr,
                tamilScript: sym,
                phonetic: `${ipa}${vIpa}`,
                questions: speedQuestions
            }));
        } else {
            lessons.push(makeLesson({
                stage: 3, stageOrder: n++, exerciseType: 'text_mcq',
                question: 'Spot odd one out', questionTamil: 'வேறுபட்ட எழுத்தை தேர்வு செய்',
                options: [buildUyirmei(base, 'a'), buildUyirmei(base, 'aa'), buildUyirmei(base, 'i'), odd],
                correctAnswer: odd,
                hint: bilingual('Three share same consonant base.', 'மூன்று எழுத்துகள் ஒரே மெய் அடிப்படை கொண்டவை.'),
                explanation: bilingual('Odd item has a different consonant base.', 'வேறுபட்ட மெய் அடிப்படை கொண்டது சரியான விடை.'),
                transliteration: tr, tamilScript: odd, phonetic: `${ipa}${vIpa}`
            }));
        }
    });
    return lessons;
};
const buildStage4 = () => {
    const lessons = [];
    let n = 1;
    const nums = [
        ['ஒன்று', 'one', 'ondru'], ['இரண்டு', 'two', 'irandu'], ['மூன்று', 'three', 'moondru'], ['நான்கு', 'four', 'naanku'],
        ['ஐந்து', 'five', 'aindhu'], ['ஆறு', 'six', 'aaru'], ['ஏழு', 'seven', 'ezhu'], ['எட்டு', 'eight', 'ettu'],
        ['ஒன்பது', 'nine', 'onbadhu'], ['பத்து', 'ten', 'paththu'], ['பதினொன்று', 'eleven', 'pathinonru'], ['பன்னிரண்டு', 'twelve', 'pannirandu']
    ];
    nums.slice(0, 8).forEach(([ta, en, tr], i) => {
        const options = cycleWindow(nums, i + 1, 3).map((item) => item[0]);
        lessons.push(makeLesson({
            stage: 4, stageOrder: n++, difficulty: n === 2 ? 'Beginner' : undefined, exerciseType: 'audio_mcq',
            question: `Number dictation: choose Tamil for ${en}`, questionTamil: `எண் பயிற்சி: ${en} க்கு தமிழ் வடிவத்தை தேர்வு செய்`,
            options: [ta, ...options], correctAnswer: ta,
            hint: bilingual('Say the number aloud before choosing.', 'எண்ணை வாய்வழி சொன்னபின் தேர்வு செய்.'),
            explanation: bilingual(`${en} in Tamil is ${ta}.`, `${en} என்பதற்கு தமிழில் ${ta} என்று சொல்வோம்.`),
            transliteration: tr, tamilScript: ta, audioKey: ta
        }));
    });

    const days = [
        ['திங்கள்', 'Monday', 'thingal'], ['செவ்வாய்', 'Tuesday', 'sevvaai'], ['புதன்', 'Wednesday', 'budhan'],
        ['வியாழன்', 'Thursday', 'viyaazhan'], ['வெள்ளி', 'Friday', 'velli'], ['சனி', 'Saturday', 'sani'], ['ஞாயிறு', 'Sunday', 'nyaayiru']
    ];
    for (let i = 0; i < 3; i += 1) {
        const chunk = cycleWindow(days, i * 2, 4);
        lessons.push(makeLesson({
            stage: 4, stageOrder: n++, exerciseType: 'drag_match',
            question: 'Weekday order drill: match Tamil and English', questionTamil: 'வாரநாள் ஒழுங்கு: தமிழ் மற்றும் ஆங்கிலத்தை பொருத்துக',
            correctAnswer: 'all-matched',
            hint: bilingual('Start from the day you remember best.', 'நினைவில் இருக்கும் நாளில் இருந்து தொடங்கு.'),
            explanation: bilingual('Weekday mapping helps daily conversation.', 'வாரநாள் பொருத்தம் நாளாந்த உரையாடலுக்கு உதவும்.'),
            transliteration: chunk.map((day) => day[2]).join(', '),
            tamilScript: chunk.map((day) => day[0]).join(', '),
            dragItems: chunk.map((day) => day[0]),
            dragTargets: chunk.map((day) => day[1]),
            correctOrder: [0, 1, 2, 3]
        }));

        const [targetDay] = chunk;
        lessons.push(makeLesson({
            stage: 4, stageOrder: n++, exerciseType: 'sequence_order',
            question: `Which Tamil weekday means "${targetDay[1]}"?`, questionTamil: `"${targetDay[1]}" என்பதற்கு எந்த தமிழ் வாரநாள்?`,
            options: chunk.map((day) => day[0]),
            correctAnswer: targetDay[0],
            hint: bilingual('Recall weekday names in order Monday to Sunday.', 'திங்கள் முதல் ஞாயிறு வரை நினைவில் கொள்.'),
            explanation: bilingual(`${targetDay[1]} corresponds to ${targetDay[0]}.`, `${targetDay[1]} நாள் தமிழில் ${targetDay[0]}.`),
            transliteration: targetDay[2],
            tamilScript: targetDay[0],
            dragItems: chunk.map((day) => day[0]),
            dragTargets: ['1', '2', '3', '4'],
            correctOrder: [0, 1, 2, 3]
        }));
    }

    const months = [
        ['ஜனவரி', 'January', 'janavari'], ['பிப்ரவரி', 'February', 'pibravari'], ['மார்ச்', 'March', 'maarch'],
        ['ஏப்ரல்', 'April', 'aebral'], ['மே', 'May', 'mae'], ['ஜூன்', 'June', 'juun'],
        ['ஜூலை', 'July', 'joolai'], ['ஆகஸ்ட்', 'August', 'aagast'], ['செப்டம்பர்', 'September', 'septambar'],
        ['அக்டோபர்', 'October', 'aktobar'], ['நவம்பர்', 'November', 'navambar'], ['டிசம்பர்', 'December', 'disambar']
    ];
    for (let i = 0; i < 3; i += 1) {
        const chunk = cycleWindow(months, i * 3, 4);
        const answer = chunk[0];
        lessons.push(makeLesson({
            stage: 4, stageOrder: n++, exerciseType: 'text_mcq',
            question: `Choose Tamil month for ${answer[1]}`, questionTamil: `${answer[1]} மாதத்திற்கான தமிழ் பெயரை தேர்வு செய்`,
            options: chunk.map((month) => month[0]),
            correctAnswer: answer[0],
            hint: bilingual('Look for familiar Tamil month pronunciation.', 'தமிழ் உச்சரிப்பை நினைத்து தேர்வு செய்.'),
            explanation: bilingual(`${answer[1]} in Tamil is ${answer[0]}.`, `${answer[1]} மாதம் தமிழில் ${answer[0]}.`),
            transliteration: answer[2],
            tamilScript: answer[0]
        }));

        const nextMonth = chunk[1];
        lessons.push(makeLesson({
            stage: 4, stageOrder: n++, exerciseType: 'fill_blank',
            question: `After ${answer[0]} comes ____`, questionTamil: `${answer[0]} க்கு பிறகு வரும் மாதம் ____`,
            options: chunk.map((month) => month[0]),
            correctAnswer: nextMonth[0],
            hint: bilingual('Think of calendar order.', 'காலண்டர் வரிசையை நினைவில் கொள்.'),
            explanation: bilingual(`The next month is ${nextMonth[0]}.`, `அடுத்த மாதம் ${nextMonth[0]}.`),
            transliteration: `${answer[2]} -> ${nextMonth[2]}`,
            tamilScript: `${answer[0]} ${nextMonth[0]}`
        }));
    }

    const times = ['06:00', '08:30', '12:15', '14:00', '18:45', '20:30', '22:10'];
    times.forEach((time, i) => {
        const ans = `இப்போது மணி ${time}`;
        lessons.push(makeLesson({
            stage: 4, stageOrder: n++, exerciseType: i % 2 === 0 ? 'translation_input' : 'fill_blank',
            question: `Write Tamil time expression for ${time}`, questionTamil: `${time} நேரத்தை தமிழில் எழுதுக`,
            correctAnswer: ans, modelAnswer: ans, acceptedAnswers: [ans, `மணி ${time} ஆகிறது`],
            hint: bilingual('Use either formal or spoken Tamil time format.', 'முறையான அல்லது வழக்குச் சொல் நேர வடிவம் இரண்டும் செல்லும்.'),
            explanation: bilingual('Both accepted patterns express the same clock time.', 'இரண்டு வடிவங்களும் அதே நேரத்தைச் சொல்கின்றன.'),
            transliteration: `ippodhu mani ${time}`,
            tamilScript: ans,
            writingPrompt: `Express ${time} in Tamil.`
        }));
    });

    return lessons;
};

const buildStage5 = () => {
    const lessons = [];
    let n = 1;
    VOCAB_SETS.forEach(([nameEn, nameTa, words], setIndex) => {
        const imageWords = cycleWindow(words, setIndex, 4);
        const meaningWords = cycleWindow(words, setIndex + 2, 4);
        const dragWords = cycleWindow(words, setIndex + 4, 4);
        const spellWord = words[(setIndex + 6) % words.length];

        const imageTarget = imageWords[0];
        const meaningTarget = meaningWords[1];

        lessons.push(makeLesson({
            stage: 5, stageOrder: n++, difficulty: n === 2 ? 'Beginner' : undefined, exerciseType: 'image_mcq',
            question: `${nameEn}: Tamil word for "${imageTarget[1]}"`, questionTamil: `${nameTa}: "${imageTarget[1]}" என்பதற்கான தமிழ் சொல்`,
            options: imageWords.map((word) => word[0]), correctAnswer: imageTarget[0],
            hint: bilingual('Pick semantic match.', 'பொருள் பொருந்தும் சொல்லை தேர்வு செய்.'),
            explanation: bilingual(`${imageTarget[0]} means ${imageTarget[1]}.`, `${imageTarget[0]} என்றால் ${imageTarget[1]}.`),
            transliteration: imageTarget[2], tamilScript: imageTarget[0], imageAlt: `${nameEn} visual cue`
        }));
        lessons.push(makeLesson({
            stage: 5, stageOrder: n++, exerciseType: 'text_mcq',
            question: `${nameEn}: In the sentence "இன்று ${meaningTarget[0]} பற்றி பேசுகிறோம்", what does "${meaningTarget[0]}" mean?`,
            questionTamil: `${nameTa}: "இன்று ${meaningTarget[0]} பற்றி பேசுகிறோம்" என்ற வாக்கியத்தில் "${meaningTarget[0]}" என்பதன் பொருள் என்ன?`,
            options: meaningWords.map((word) => word[1]), correctAnswer: meaningTarget[1],
            hint: bilingual('Use context + known set words.', 'சூழல் மற்றும் இந்த தொகுப்பில் உள்ள சொற்களை நினை.'),
            explanation: bilingual(`${meaningTarget[0]} translates as ${meaningTarget[1]}.`, `${meaningTarget[0]} என்பதன் பொருள் ${meaningTarget[1]}.`),
            transliteration: meaningTarget[2], tamilScript: meaningTarget[0]
        }));
        lessons.push(makeLesson({
            stage: 5, stageOrder: n++, exerciseType: 'drag_match',
            question: `${nameEn}: match Tamil and English`, questionTamil: `${nameTa}: தமிழ் மற்றும் ஆங்கில சொற்களை பொருத்துக`,
            correctAnswer: 'all-matched', hint: bilingual('Match obvious pairs first.', 'முதல் தெரிந்த ஜோடிகளை பொருத்து.'),
            explanation: bilingual('Matching reinforces memory.', 'பொருத்துதல் நினைவாற்றலை மேம்படுத்தும்.'),
            transliteration: dragWords.map((word) => word[2]).join(', '), tamilScript: dragWords.map((word) => word[0]).join(', '),
            dragItems: dragWords.map((word) => word[0]),
            dragTargets: dragWords.map((word) => word[1]),
            correctOrder: [0, 1, 2, 3]
        }));
        lessons.push(makeLesson({
            stage: 5, stageOrder: n++, exerciseType: 'translation_input',
            question: `${nameEn}: spell Tamil for "${spellWord[1]}"`, questionTamil: `${nameTa}: "${spellWord[1]}" என்பதற்கான தமிழ் சொல்லை தட்டச்சு செய்`,
            correctAnswer: spellWord[0], modelAnswer: spellWord[0], acceptedAnswers: [spellWord[0], spellWord[0]],
            hint: bilingual('Hear the word and type carefully.', 'சொல்லை மனதில் உச்சரித்து கவனமாக தட்டச்சு செய்.'),
            explanation: bilingual(`Expected Tamil word is ${spellWord[0]}.`, `சரியான தமிழ் சொல் ${spellWord[0]}.`),
            transliteration: spellWord[2], tamilScript: spellWord[0], writingPrompt: `Write Tamil for ${spellWord[1]}.`, audioKey: spellWord[0]
        }));
    });
    return lessons;
};

const buildStage6 = () => {
    const lessons = [];
    let n = 1;
    const topics = [
        ['Pronouns', 'பொருந் பெயர்', ['நான்', 'சாதம்', 'சாப்பிடுகிறேன்']],
        ['Present tense', 'நிகழ்காலம்', ['அவன்', 'பள்ளிக்கு', 'செல்கிறான்']],
        ['Past tense', 'இறந்தகாலம்', ['நாங்கள்', 'நேற்று', 'போனோம்']],
        ['Future tense', 'எதிர்காலம்', ['அவர்கள்', 'நாளை', 'வருவார்கள்']],
        ['Negative', 'எதிர்மறை', ['நான்', 'காபி', 'குடிக்கவில்லை']],
        ['Questions', 'கேள்வி', ['நீ', 'எங்கே', 'போகிறாய்']],
        ['Location clauses', 'இடப்புணர்ச்சி', ['அவர்', 'வீட்டில்', 'இருக்கிறார்']],
        ['Polite requests', 'மரியாதை வேண்டுகோள்', ['நீங்கள்', 'அமைதியாக', 'காத்திருக்குங்கள்']]
    ];
    topics.forEach(([en, ta, sent]) => {
        const [a, b, c] = sent;
        lessons.push(makeLesson({
            stage: 6, stageOrder: n++, difficulty: n === 2 ? 'Beginner' : undefined, exerciseType: 'sentence_builder',
            question: `${en}: build SOV sentence`, questionTamil: `${ta}: SOV வாக்கியத்தை அமைக்க`,
            correctAnswer: `${a} ${b} ${c}`, hint: bilingual('Verb usually comes last.', 'வினைச்சொல் பொதுவாக இறுதியில் வரும்.'),
            explanation: bilingual('Tamil follows SOV order.', 'தமிழ் SOV வரிசையைக் கடைபிடிக்கும்.'),
            transliteration: sent.join(' '), tamilScript: `${a} ${b} ${c}`, sentenceParts: [b, c, a], correctOrder: [2, 0, 1]
        }));
        lessons.push(makeLesson({
            stage: 6, stageOrder: n++, exerciseType: 'tense_transform',
            question: `${en}: transform tense`, questionTamil: `${ta}: கால மாற்றம் செய்`,
            correctAnswer: `${a} ${b} ${c}`, modelAnswer: `${a} ${b} ${c}`, acceptedAnswers: [`${a} ${b} ${c}`, `${a} ${b} ${c}`],
            hint: bilingual('Change verb ending carefully.', 'வினை முடிவை கவனமாக மாற்று.'),
            explanation: bilingual('Tense appears in final verb form.', 'காலம் இறுதி வினை வடிவத்தில் தெரியும்.'),
            transliteration: sent.join(' '), tamilScript: `${a} ${b} ${c}`, writingPrompt: `Transform sentence: ${a} ${b} ${c}`
        }));
        lessons.push(makeLesson({
            stage: 6, stageOrder: n++, exerciseType: 'error_spot',
            question: `${en}: find wrong token`, questionTamil: `${ta}: தவறான சொல்லை கண்டுபிடி`,
            options: ['தவறு', 'சரி', 'இல்லை', 'ஆம்'], correctAnswer: 'தவறு',
            hint: bilingual('Check agreement first.', 'ஒத்திசை சரிபார்க்கவும்.'),
            explanation: bilingual('One word breaks grammar.', 'ஒரு சொல் இலக்கணத்தை குலைக்கிறது.'),
            transliteration: sent.join(' '), tamilScript: `${a} ${b} ${c}`
        }));
        lessons.push(makeLesson({
            stage: 6, stageOrder: n++, exerciseType: 'text_mcq',
            question: `${en}: choose correct translation`, questionTamil: `${ta}: சரியான மொழிபெயர்ப்பை தேர்வு செய்`,
            options: [`${a} ${b} ${c}`, `${b} ${a} ${c}`, `${a} ${c} ${b}`, `${c} ${a} ${b}`], correctAnswer: `${a} ${b} ${c}`,
            hint: bilingual('Keep SOV order.', 'SOV வரிசையை பின்பற்று.'),
            explanation: bilingual('Correct option keeps subject-object-verb.', 'சரியான விடை SOV வரிசையை பாதுகாக்கும்.'),
            transliteration: sent.join(' '), tamilScript: `${a} ${b} ${c}`
        }));
        lessons.push(makeLesson({
            stage: 6, stageOrder: n++, exerciseType: 'fill_blank',
            question: `${en}: fill verb`, questionTamil: `${ta}: வினையை நிரப்பு`,
            options: [c, `${c}கள்`, `${c}ம்`, `${c}து`], correctAnswer: c,
            hint: bilingual('Pick conjugation matching subject.', 'பொருளுக்கு பொருந்தும் வினையை தேர்வு செய்.'),
            explanation: bilingual('Verb agreement is required.', 'வினை ஒத்திசை அவசியம்.'),
            transliteration: sent.join(' '), tamilScript: `${a} ${b} ${c}`
        }));
    });
    return lessons;
};
const buildStage7 = () => {
    const lessons = [];
    let n = 1;
    const dialogues = [
        {
            en: 'Greetings & Introductions',
            ta: 'வணக்கம் மற்றும் அறிமுகம்',
            line: 'வணக்கம்! உங்கள் பெயர் என்ன?',
            formalReply: 'வணக்கம். என் பெயர் அருண். உங்களை சந்தித்ததில் மகிழ்ச்சி.',
            colloquialReply: 'வணக்கம். என் பேர் அருண். சந்திச்சது ரொம்ப சந்தோஷம்.',
            blank: 'பெயர்',
            sequence: ['வணக்கம்!', 'வணக்கம். என் பெயர் அருண்.', 'நீங்கள் எப்படி இருக்கிறீர்கள்?', 'நான் நன்றாக இருக்கிறேன்.'],
            culturalNote: 'முதல் சந்திப்பில் "நீங்கள்" பயன்பாடு மரியாதையாக கருதப்படும்.',
            transliteration: 'vanakkam unga peyar enna'
        },
        {
            en: 'Restaurant Ordering',
            ta: 'உணவகம்',
            line: 'என்ன சாப்பாடு இருக்கிறது?',
            formalReply: 'எனக்கு ஒரு தோசைவும் ஒரு காபியும் வேண்டும்.',
            colloquialReply: 'எனக்கு ஒரு தோசை, ஒரு காபி வேணும்.',
            blank: 'வேண்டும்',
            sequence: ['உங்களுக்கு என்ன வேண்டும்?', 'எனக்கு ஒரு தோசை வேண்டும்.', 'இன்னும் ஏதும் வேண்டுமா?', 'இல்லை, நன்றி.'],
            culturalNote: 'உணவகத்தில் தெளிவாகவும் மரியாதையுடனும் ஆர்டர் செய்வது நல்ல நடைமுறை.',
            transliteration: 'oru dosai vendum'
        },
        {
            en: 'Asking Directions',
            ta: 'வழி கேட்பு',
            line: 'ரயில் நிலையம் எங்கே உள்ளது?',
            formalReply: 'நேராக சென்று, இரண்டாவது சிக்னலில் வலப்பக்கம் திரும்புங்கள்.',
            colloquialReply: 'நேரா போங்க, இரண்டாவது சிக்னல்ல வலதுபக்கம் திரும்புங்க.',
            blank: 'எங்கே',
            sequence: ['ரயில் நிலையம் எங்கே?', 'நேராக செல்லுங்கள்.', 'வலப்பக்கம் திரும்புங்கள்.', 'அங்கே தான் நிலையம்.'],
            culturalNote: 'வழி சொல்வதில் "செல்லுங்கள்/திரும்புங்கள்" போன்ற மரியாதை வினைச்சொற்கள் பொதுவாக பயன்படுத்தப்படும்.',
            transliteration: 'nilaiyam enge ulladhu'
        },
        {
            en: 'Shopping & Bargaining',
            ta: 'கடை மற்றும் விலை பேசுதல்',
            line: 'இது எவ்வளவு ரூபாய்?',
            formalReply: 'கொஞ்சம் குறைக்க முடியுமா? நான் இரண்டு எடுத்துக் கொள்கிறேன்.',
            colloquialReply: 'கொஞ்சம் குறைச்சு குடுங்க, நான் இரண்டு எடுக்கிறேன்.',
            blank: 'எவ்வளவு',
            sequence: ['இது எவ்வளவு?', 'இது இருநூறு ரூபாய்.', 'கொஞ்சம் குறைக்க முடியுமா?', 'சரி, நூற்று எண்பது கொடுங்கள்.'],
            culturalNote: 'சந்தையில் மரியாதையுடன் விலை பேசுவது வழக்கமான உரையாடல் திறன்.',
            transliteration: 'idhu evvalavu roobai'
        },
        {
            en: 'Doctor Visit',
            ta: 'மருத்துவர் சந்திப்பு',
            line: 'எனக்கு இரண்டு நாட்களாக காய்ச்சல் இருக்கிறது.',
            formalReply: 'மருந்தை நேரத்திற்கு எடுத்துக்கொள்ளுங்கள், ஓய்வும் எடுக்க வேண்டும்.',
            colloquialReply: 'மருந்து நேரத்துக்கு எடுத்துக்கோங்க, நல்லா ஓய்வு எடுங்க.',
            blank: 'காய்ச்சல்',
            sequence: ['என்ன பிரச்சனை?', 'எனக்கு காய்ச்சல் உள்ளது.', 'இந்த மருந்தை எடுத்துக்கொள்ளுங்கள்.', 'மூன்று நாள் ஓய்வு எடுத்துக்கொள்ளுங்கள்.'],
            culturalNote: 'மருத்துவ உரையாடலில் அறிகுறிகளை நேரம் குறிப்பிடி தெளிவாகச் சொல்லுவது முக்கியம்.',
            transliteration: 'enakku kaichal irukku'
        },
        {
            en: 'Phone & Travel',
            ta: 'தொலைபேசி மற்றும் பயணம்',
            line: 'சென்னை பஸ் எத்தனை மணிக்கு வருகிறது?',
            formalReply: 'பஸ் ஆறு முப்பது மணிக்கு வரும்; முன்பே நிலையத்திற்கு வாருங்கள்.',
            colloquialReply: 'பஸ் ஆறு முப்பதுக்கு வரும்; கொஞ்சம் முன்னாடியே நிலையத்துக்கு வாங்க.',
            blank: 'மணிக்கு',
            sequence: ['சென்னை பஸ் எத்தனை மணிக்கு?', 'ஆறு முப்பது மணிக்கு வரும்.', 'டிக்கெட் முன்பே எடுத்துக்கொள்ளுங்கள்.', 'நன்றி, நான் நேரத்தில் வருகிறேன்.'],
            culturalNote: 'பயண தகவல் கேட்கும் போது நேரம், தளம், டிக்கெட் விவரங்களை உறுதிப்படுத்துவது நல்லது.',
            transliteration: 'bus etthanai manikku varum'
        },
        {
            en: 'Bank & Payments',
            ta: 'வங்கி மற்றும் கட்டண சேவை',
            line: 'இந்த கணக்கில் பணம் செலுத்த எங்கே செல்ல வேண்டும்?',
            formalReply: 'முதல் மாடியில் உள்ள கவுண்டருக்கு செல்லுங்கள்; அங்கே ரசீது வழங்கப்படும்.',
            colloquialReply: 'முதல் மாடி கவுண்டருக்குப் போங்க; அங்க ரசீது தருவாங்க.',
            blank: 'செலுத்த',
            sequence: ['இந்த கணக்கில் பணம் செலுத்த வேண்டும்.', 'முதல் மாடி கவுண்டருக்கு செல்லுங்கள்.', 'இந்த படிவத்தை நிரப்புங்கள்.', 'ரசீதை பாதுகாப்பாக வைத்துக்கொள்ளுங்கள்.'],
            culturalNote: 'வங்கியில் வரிசை ஒழுங்கையும் ஆவணங்களையும் சரியாக பின்பற்றுவது முக்கியம்.',
            transliteration: 'kanakkil panam selutha enge sella vendum'
        },
        {
            en: 'Office Meeting',
            ta: 'அலுவலக கூட்டம்',
            line: 'கூட்டம் எப்போது தொடங்கும்?',
            formalReply: 'கூட்டம் பத்து மணிக்கு தொடங்கும்; தயவு செய்து அறிக்கை கோப்பை கொண்டு வாருங்கள்.',
            colloquialReply: 'மீட்டிங் பத்து மணிக்கு ஆரம்பம்; ரிப்போர்ட் கோப்பை கொண்டு வாங்க.',
            blank: 'எப்போது',
            sequence: ['கூட்டம் எப்போது தொடங்கும்?', 'கூட்டம் பத்து மணிக்கு தொடங்கும்.', 'அதற்கு முன் அறிக்கை தயார் செய்யுங்கள்.', 'கேள்விகள் இருந்தால் முடிவில் கேளுங்கள்.'],
            culturalNote: 'அலுவலக உரையாடலில் நேரம், பொறுப்பு, மற்றும் மரியாதை மொழி தெளிவாக இருக்க வேண்டும்.',
            transliteration: 'kootam eppodhu thodangum'
        }
    ];

    dialogues.forEach((dialogue) => {
        lessons.push(makeLesson({
            stage: 7, stageOrder: n++, difficulty: n === 2 ? 'Beginner' : undefined, exerciseType: 'role_play_mcq',
            question: `${dialogue.en}: choose the best polite response`, questionTamil: `${dialogue.ta}: மிகச் சரியான மரியாதையான பதிலை தேர்வு செய்`,
            options: [dialogue.formalReply, 'எனக்கு தெரியாது.', 'பிறகு பார்ப்போம்.', 'இப்போது பேச முடியாது.'],
            correctAnswer: dialogue.formalReply,
            hint: bilingual('Choose polite context response.', 'மரியாதையான சூழல் பதிலைத் தேர்வு செய்.'),
            explanation: bilingual('Reply fits context naturally.', 'பதில் உரையாடலுக்கு பொருந்துகிறது.'),
            transliteration: dialogue.transliteration,
            tamilScript: dialogue.line,
            culturalNote: bilingual('Prefer formal forms in public contexts.', dialogue.culturalNote)
        }));
        lessons.push(makeLesson({
            stage: 7, stageOrder: n++, exerciseType: 'dialogue_sequence',
            question: `${dialogue.en}: sequence the dialogue`, questionTamil: `${dialogue.ta}: உரையாடல் வரிசையை அமைக்க`,
            correctAnswer: 'sequence', hint: bilingual('Start with opening line.', 'தொடக்க வரியிலிருந்து தொடங்கு.'),
            explanation: bilingual('Logical turn-taking matters.', 'மாறிமாறி பேசும் வரிசை முக்கியம்.'),
            transliteration: dialogue.transliteration,
            tamilScript: dialogue.sequence.join(' '),
            dragItems: dialogue.sequence,
            dragTargets: ['Turn 1', 'Turn 2', 'Turn 3', 'Turn 4'],
            correctOrder: [0, 1, 2, 3],
            culturalNote: bilingual('Respectful turn-taking improves clarity.', 'மரியாதையுடன் மாறிமாறிப் பேசுதல் தெளிவை தரும்.')
        }));
        lessons.push(makeLesson({
            stage: 7, stageOrder: n++, exerciseType: 'fill_blank',
            question: `${dialogue.en}: fill the key word`, questionTamil: `${dialogue.ta}: முக்கியச் சொல்லை நிரப்பு`,
            options: [dialogue.blank, 'இன்று', 'பிறகு', 'அங்கு'], correctAnswer: dialogue.blank,
            hint: bilingual('Use context keyword.', 'சூழல் சொல்லை பயன்படுத்தவும்.'),
            explanation: bilingual('The blank needs the key noun/wh-word.', 'காலிக்கு முக்கிய பெயர்ச் சொல்/கேள்விச் சொல் தேவை.'),
            transliteration: dialogue.transliteration, tamilScript: dialogue.line
        }));
        lessons.push(makeLesson({
            stage: 7, stageOrder: n++, exerciseType: 'translation_input',
            question: `${dialogue.en}: type a natural Tamil reply`, questionTamil: `${dialogue.ta}: இயல்பான தமிழ் பதிலை தட்டச்சு செய்`,
            correctAnswer: dialogue.formalReply,
            modelAnswer: dialogue.formalReply,
            acceptedAnswers: [dialogue.formalReply, dialogue.colloquialReply],
            hint: bilingual('Use scenario-specific words and polite ending.', 'சூழலுக்கு பொருந்தும் சொற்களையும் மரியாதை முடிவையும் பயன்படுத்து.'),
            explanation: bilingual('Both formal and colloquial variants can be acceptable by context.', 'சூழலுக்கு ஏற்ப முறையானதும் வழக்குச் சொல்லும் ஏற்றுக்கொள்ளப்படும்.'),
            transliteration: dialogue.transliteration,
            tamilScript: dialogue.formalReply,
            writingPrompt: `Reply in Tamil for: ${dialogue.line}`,
            culturalNote: bilingual('Use respectful tone.', dialogue.culturalNote)
        }));
    });
    return lessons;
};

const buildStage8 = () => {
    const lessons = [];
    let n = 1;
    const readings = [
        {
            title: 'Beginner Reading 1 - Family Morning',
            passage: ['மீனா காலை சீக்கிரம் எழுகிறார்.', 'அவர் அம்மாவுடன் காலை உணவு சாப்பிடுகிறார்.', 'பிறகு பள்ளிக்கு செல்கிறார்.'],
            statement: 'மீனா பள்ளிக்கு செல்கிறார்.',
            statementIsTrue: true,
            summaryCorrect: 'மீனாவின் காலை நடைமுறையை பகுதி சொல்கிறது.',
            summaryDistractors: ['மீனா முழு நாள் தூங்குகிறார்.', 'மீனா பள்ளிக்கு போகவில்லை.', 'மீனா இரவு வேலை செய்கிறார்.'],
            transliteration: 'meena kaalai nadaimurai'
        },
        {
            title: 'Beginner Reading 2 - Market Visit',
            passage: ['ரவி மற்றும் அப்பா சந்தைக்கு செல்கிறார்கள்.', 'அவர்கள் காய்கறி மற்றும் பழம் வாங்குகிறார்கள்.', 'வீட்டிற்கு திரும்பும்போது மழை பெய்கிறது.'],
            statement: 'அவர்கள் சந்தைக்கு சென்றார்கள்.',
            statementIsTrue: true,
            summaryCorrect: 'சந்தை சென்று பொருட்கள் வாங்கிய அனுபவம் இந்த பகுதியில் உள்ளது.',
            summaryDistractors: ['அவர்கள் பள்ளியில் பாடம் படித்தார்கள்.', 'அவர்கள் மருத்துவரை சந்தித்தார்கள்.', 'அவர்கள் பயணம் ரத்து செய்தார்கள்.'],
            transliteration: 'sandhai payanam'
        },
        {
            title: 'Beginner Reading 3 - Pet Cat',
            passage: ['லலிதாவுக்கு ஒரு பூனை இருக்கிறது.', 'அந்த பூனைக்கு பால் குடிக்க மிகவும் பிடிக்கும்.', 'மாலை நேரத்தில் அது தோட்டத்தில் விளையாடும்.'],
            statement: 'பூனைக்கு பால் பிடிக்கும்.',
            statementIsTrue: true,
            summaryCorrect: 'லலிதாவின் பூனையின் பழக்கங்களைப் பற்றி பகுதி கூறுகிறது.',
            summaryDistractors: ['பூனைக்கு நீச்சல் பிடிக்கும்.', 'லலிதா பூனையை விற்றுவிட்டார்.', 'பூனை நாள் முழுவதும் தூங்காது.'],
            transliteration: 'poonai pazhakkam'
        },
        {
            title: 'Beginner Reading 4 - Rainy Day',
            passage: ['இன்று காலை வானம் மேகமாக இருந்தது.', 'சற்று நேரத்தில் மழை ஆரம்பமானது.', 'குழந்தைகள் மழையை பார்த்து மகிழ்ந்தார்கள்.'],
            statement: 'இன்று மழை பெய்தது.',
            statementIsTrue: true,
            summaryCorrect: 'மழை நாளின் காட்சியை இந்த பகுதி விளக்குகிறது.',
            summaryDistractors: ['இன்று கடும் வெயில் இருந்தது.', 'குழந்தைகள் பள்ளிக்கு போகவில்லை.', 'வானம் முழுவதும் தெளிவாக இருந்தது.'],
            transliteration: 'mazhai naal'
        },
        {
            title: 'Beginner Reading 5 - School Library',
            passage: ['அருண் பள்ளி நூலகத்திற்கு செல்கிறான்.', 'அவன் தமிழ் கதை புத்தகம் எடுக்கிறான்.', 'மாலை வரை அமைதியாக படிக்கிறான்.'],
            statement: 'அருண் நூலகத்தில் படிக்கிறான்.',
            statementIsTrue: true,
            summaryCorrect: 'அருணின் நூலகப் பழக்கம் பற்றிய பகுதி இது.',
            summaryDistractors: ['அருண் நூலகத்தில் விளையாடுகிறான்.', 'அருண் புத்தகம் வாங்கவில்லை.', 'அருண் பள்ளிக்கு வரவில்லை.'],
            transliteration: 'noolagam padippu'
        },
        {
            title: 'Intermediate Reading 1 - Bus Journey',
            passage: ['கோவை நகரத்தில் காலை பேருந்து நிறைய கூட்டமாக இருக்கும்.', 'வித்யா எப்போதும் பத்து நிமிடம் முன்பே நிறுத்தத்திற்கு வருவாள்.', 'இன்று பேருந்து தாமதமாக வந்ததால் அவர் அலுவலகத்திற்கு சிறிது தாமதமாக சென்றார்.', 'ஆனால் கூட்டத்திலும் அவர் அமைதியாக இருந்தார்.'],
            statement: 'வித்யா முன்பே நிறுத்தத்திற்கு வருவாள்.',
            statementIsTrue: true,
            summaryCorrect: 'தாமதமான பேருந்து காரணமாக ஏற்பட்ட அலுவலக பயண அனுபவம் இது.',
            summaryDistractors: ['வித்யா பேருந்தில் செல்ல மாட்டாள்.', 'வித்யா வேலைக்கு இன்று செல்லவில்லை.', 'பேருந்து காலியாக வந்தது.'],
            transliteration: 'perundhu payanam'
        },
        {
            title: 'Intermediate Reading 2 - Village Festival',
            passage: ['எங்கள் கிராமத்தில் ஆண்டுதோறும் கோடைத் திருவிழா நடக்கும்.', 'காலை கோவில் ஊர்வலம் ஆரம்பித்து, மாலை நாட்டுப்புற கலை நிகழ்ச்சி நடக்கும்.', 'இந்த ஆண்டு பள்ளி மாணவர்களும் தங்கள் நடனத்தை வழங்கினர்.', 'விழாவுக்குப் பிறகு எல்லோரும் இணைந்து உணவு பகிர்ந்தனர்.'],
            statement: 'விழாவில் மாணவர்கள் நடனம் ஆடினர்.',
            statementIsTrue: true,
            summaryCorrect: 'கிராமத் திருவிழாவின் நிகழ்வுகள் மற்றும் சமூக ஒற்றுமையை பகுதி காட்டுகிறது.',
            summaryDistractors: ['விழா இந்த ஆண்டு நடத்தப்படவில்லை.', 'கோவில் ஊர்வலம் இல்லை.', 'மக்கள் தனித்தனியாக சென்றார்கள்.'],
            transliteration: 'grama thiruvizha'
        },
        {
            title: 'Intermediate Reading 3 - Health Camp',
            passage: ['நேற்று அருகிலுள்ள பள்ளியில் இலவச மருத்துவ முகாம் நடந்தது.', 'மருத்துவர் குழந்தைகளின் கண் மற்றும் பல் பரிசோதனை செய்தார்.', 'பெற்றோர்களுக்கு சுகாதார பழக்கங்கள் பற்றிய விளக்கமும் வழங்கப்பட்டது.', 'முகாமின் முடிவில் மருந்துகள் இலவசமாக வழங்கப்பட்டன.'],
            statement: 'மருந்துகள் இலவசமாக வழங்கப்பட்டன.',
            statementIsTrue: true,
            summaryCorrect: 'மருத்துவ முகாமில் பரிசோதனை மற்றும் விழிப்புணர்வு நடவடிக்கைகள் நடந்தன.',
            summaryDistractors: ['முகாம் ரத்து செய்யப்பட்டது.', 'மருத்துவர் வரவில்லை.', 'பெற்றோர்கள் முகாமில் கலந்துகொள்ளவில்லை.'],
            transliteration: 'maruthuva mukhaam'
        },
        {
            title: 'Intermediate Reading 4 - Tree Planting',
            passage: ['பள்ளி சுற்றுச்சூழல் குழு இந்த வாரம் மரநடுகை திட்டம் செய்தது.', 'ஒவ்வொரு வகுப்பும் இரண்டு செடிகள் நடும் பொறுப்பு பெற்றது.', 'செடிகளுக்கு தண்ணீர் ஊற்ற வார அட்டவணையும் தயார் செய்யப்பட்டது.', 'ஒரு மாதத்தில் பள்ளி வளாகம் பசுமையாக மாறியது.'],
            statement: 'ஒவ்வொரு வகுப்பும் இரண்டு செடிகள் நடும் பொறுப்பு பெற்றது.',
            statementIsTrue: true,
            summaryCorrect: 'மரநடுகை மூலம் பள்ளி சூழல் மேம்பட்டதை பகுதி விளக்குகிறது.',
            summaryDistractors: ['மரநடுகை திட்டம் நிறுத்தப்பட்டது.', 'யாரும் செடிகளை நடவில்லை.', 'பள்ளி வளாகம் காலியாக இருந்தது.'],
            transliteration: 'maram nadugai'
        },
        {
            title: 'Intermediate Reading 5 - Reading Club',
            passage: ['நகர நூலகத்தில் மாதந்தோறும் வாசிப்பு வட்டம் நடத்தப்படுகிறது.', 'இந்த முறை தலைப்பு "தமிழ் சிறுகதை" ஆகும்.', 'ஒவ்வொருவரும் ஒரு கதை தேர்வு செய்து அதன் கருத்தை பகிர்ந்தனர்.', 'சிறந்த விளக்கத்திற்கு சிறிய பரிசும் வழங்கப்பட்டது.'],
            statement: 'வாசிப்பு வட்டத்தில் கதைகள் பற்றி பகிர்ந்தனர்.',
            statementIsTrue: true,
            summaryCorrect: 'வாசிப்பு வட்டத்தின் கலந்துரையாடல் மற்றும் பரிசளிப்பு நிகழ்ச்சி இந்த பகுதியில் உள்ளது.',
            summaryDistractors: ['நூலகம் மூடப்பட்டது.', 'யாரும் பேசவில்லை.', 'பரிசு வழங்கப்படவில்லை.'],
            transliteration: 'vaasippu vattam'
        },
        {
            title: 'Advanced Reading 1 - Coastal Cleanup',
            passage: ['கடற்கரை அருகிலுள்ள பள்ளி மாணவர்கள் ஒரு சுத்தம் செய் திட்டத்தில் கலந்து கொண்டனர்.', 'முதல் நாளில் அவர்கள் பிளாஸ்டிக் கழிவுகளை தனியே சேகரித்தனர்.', 'இரண்டாம் நாளில் மீனவர்கள் உடன் பேசிச் கழிவு குறைப்பின் முக்கியத்துவத்தை புரிந்துகொண்டனர்.', 'ஆசிரியர்கள் மறுசுழற்சி பற்றிய பயிற்சி நடத்தியதால் குழந்தைகள் புதிய பழக்கத்தை தொடங்கினர்.', 'ஒரு மாதத்திற்குப் பிறகு அந்த கடற்கரை மிகவும் சுத்தமாக காணப்பட்டது.'],
            statement: 'மாணவர்கள் பிளாஸ்டிக் கழிவுகளை சேகரித்தனர்.',
            statementIsTrue: true,
            summaryCorrect: 'கூட்டு முயற்சியால் கடற்கரை சுத்தம் மற்றும் விழிப்புணர்வு உயர்ந்ததை பகுதி சொல்கிறது.',
            summaryDistractors: ['கடற்கரை திட்டம் தோல்வியடைந்தது.', 'மாணவர்கள் எந்த பணியும் செய்யவில்லை.', 'மீனவர்கள் திட்டத்தில் எதிர்ப்பு தெரிவித்தனர்.'],
            transliteration: 'kadarkarai sutham'
        },
        {
            title: 'Advanced Reading 2 - Folk Art Class',
            passage: ['ஒரு அரசு பள்ளியில் நாட்டுப்புற கலை பயிற்சி மையம் தொடங்கப்பட்டது.', 'கலை ஆசிரியர் வாரத்தில் மூன்று நாட்கள் இசை மற்றும் நடனப் பயிற்சி அளித்தார்.', 'முதலில் மாணவர்கள் வெகுளியாக இருந்தாலும், சில வாரங்களில் தன்னம்பிக்கை அதிகரித்தது.', 'பள்ளி நாள் நிகழ்ச்சியில் அவர்கள் தங்கள் கலை நிகழ்ச்சியை வழங்கினர்.', 'பெற்றோர்கள் மற்றும் ஆசிரியர்கள் மாணவர்களை பாராட்டினார்கள்.'],
            statement: 'பயிற்சிக்குப் பிறகு மாணவர்களின் தன்னம்பிக்கை உயர்ந்தது.',
            statementIsTrue: true,
            summaryCorrect: 'கலைப் பயிற்சி மாணவர்களின் திறனையும் நம்பிக்கையையும் வளர்த்தது என்பதை பகுதி காட்டுகிறது.',
            summaryDistractors: ['கலை வகுப்பு நிறுத்தப்பட்டது.', 'மாணவர்கள் நிகழ்ச்சியில் கலந்துகொள்ளவில்லை.', 'பெற்றோர்கள் விமர்சனம் செய்தனர்.'],
            transliteration: 'nattupura kalai'
        },
        {
            title: 'Advanced Reading 3 - Community Kitchen',
            passage: ['வெள்ளப்பெருக்கிற்குப் பிறகு ஊராட்சி மன்றம் அவசர சமூக சமையலறை அமைத்தது.', 'தன்னார்வலர்கள் காலை முதல் இரவு வரை உணவு தயாரித்து குடும்பங்களுக்கு வழங்கினர்.', 'மருத்துவர்கள் குடிநீர் மற்றும் சுகாதார விழிப்புணர்வு ஆலோசனை வழங்கினர்.', 'உள்ளூர் இளைஞர்கள் மூத்த குடிமக்களுக்கு மருந்து கொண்டு செல்லும் பணியிலும் ஈடுபட்டனர்.', 'இரண்டு வாரங்களில் நிலைமை சீரானதும், இந்த தற்காலிக மையம் முறையாக மூடப்பட்டது.'],
            statement: 'தன்னார்வலர்கள் உணவு வழங்கினர்.',
            statementIsTrue: true,
            summaryCorrect: 'அவசர நிலைமையில் சமூக ஒத்துழைப்பால் பல சேவைகள் வழங்கப்பட்டதை பகுதி விளக்குகிறது.',
            summaryDistractors: ['யாரும் உதவிக்காக வரவில்லை.', 'உணவு மையம் திறக்கப்படவில்லை.', 'மருத்துவ ஆலோசனை அளிக்கப்படவில்லை.'],
            transliteration: 'samuga samayalarai'
        },
        {
            title: 'Advanced Reading 4 - Women Self-Help Group',
            passage: ['எங்கள் பகுதியில் பெண்கள் சுயஉதவி குழு கடந்த ஐந்து ஆண்டுகளாக செயல்படுகிறது.', 'அவர்கள் மாதாந்திர சேமிப்பு திட்டத்தின் மூலம் சிறு கடன் வழங்கி சிறு தொழில்களை தொடங்க உதவுகின்றனர்.', 'இந்த ஆண்டு குழு உறுப்பினர்கள் இணைந்து வீட்டிலேயே தயாரிக்கும் உணவுப் பொருட்களுக்கு ஆன்லைன் சந்தை தொடங்கினர்.', 'வருமானம் அதிகரித்ததன் மூலம் பல குடும்பங்கள் கல்விக்கான செலவுகளை சுலபமாக நிர்வகிக்க முடிந்தது.', 'குழு தலைவர் அடுத்த ஆண்டு இளைஞர்களுக்கும் தொழில் பயிற்சி அளிக்க திட்டமிட்டுள்ளார்.'],
            statement: 'சுயஉதவி குழு சிறு தொழில்களுக்கு உதவுகிறது.',
            statementIsTrue: true,
            summaryCorrect: 'சேமிப்பு, கடன், மற்றும் புதிய சந்தை முயற்சிகள் மூலம் சமூக முன்னேற்றம் ஏற்பட்டதை பகுதி சொல்கிறது.',
            summaryDistractors: ['குழு உறுப்பினர்கள் திட்டத்தை நிறுத்தினர்.', 'வருமானம் குறைந்தது.', 'கல்வி செலவுகள் அதிக சிரமமாகின.'],
            transliteration: 'suyauthavi kuzhu'
        },
        {
            title: 'Advanced Reading 5 - Local News Bulletin',
            passage: ['நகராட்சி வார இதழில் இந்த வாரம் மூன்று முக்கிய செய்திகள் வெளியானது.', 'முதல் செய்தி புதிய குடிநீர் குழாய் அமைப்பைப் பற்றியது; இதனால் இரண்டு பகுதிகளுக்கு சீரான தண்ணீர் விநியோகம் தொடங்கியது.', 'இரண்டாம் செய்தி பொது நூலகத்தின் டிஜிட்டல் பிரிவை விரிவுபடுத்தியது குறித்து பேசுகிறது.', 'மூன்றாம் செய்தி இளைஞர்களுக்கான வேலைவாய்ப்பு முகாம் தேதி அறிவிப்பை கொண்டுள்ளது.', 'இந்த அறிவிப்புகளால் குடியிருப்பவர்கள் அடுத்த மாத திட்டமிடலை தெளிவாக செய்ய முடிந்தது.'],
            statement: 'இதழில் வேலைவாய்ப்பு முகாம் பற்றிய தகவல் இருந்தது.',
            statementIsTrue: true,
            summaryCorrect: 'நகராட்சி அறிவிப்புகள் குடியிருப்பர்களின் தினசரி திட்டமிடலை எளிதாக்கின என்பதை பகுதி விளக்குகிறது.',
            summaryDistractors: ['இதழில் எந்த அறிவிப்பும் இல்லை.', 'குடிநீர் திட்டம் நிறுத்தப்பட்டது.', 'நூலகம் மூடப்பட்டது.'],
            transliteration: 'ulloor seithi'
        }
    ];

    readings.forEach((reading, index) => {
        const level = index < 5 ? 'Beginner' : index < 10 ? 'Intermediate' : 'Advanced';
        const passage = reading.passage.join('\n');
        const trueFalseAnswer = reading.statementIsTrue ? 'True' : 'False';

        lessons.push(makeLesson({
            stage: 8, stageOrder: n++, difficulty: index === 0 ? 'Beginner' : level, exerciseType: 'true_false',
            question: `Statement: ${reading.statement} True/False?`,
            questionTamil: `வாக்கியம்: ${reading.statement} இது உண்மையா?`,
            options: ['True', 'False', 'Not given', 'Both'], correctAnswer: trueFalseAnswer,
            hint: bilingual('Find the exact supporting sentence in the passage.', 'பகுதியில் அதே தகவல் உள்ள வாக்கியத்தை தேடு.'),
            explanation: bilingual('True/False answers depend on direct textual evidence.', 'உண்மை/பொய் விடை நேரடி உரை ஆதாரத்தின் அடிப்படையில் தீர்மானிக்கப்படுகிறது.'),
            transliteration: reading.transliteration, tamilScript: reading.statement, passage, passageTitle: reading.title
        }));

        lessons.push(makeLesson({
            stage: 8, stageOrder: n++, difficulty: level, exerciseType: 'comprehension_mcq',
            question: 'Choose the best summary for this passage', questionTamil: 'இந்த பகுதியின் சிறந்த சுருக்கத்தை தேர்வு செய்',
            options: [reading.summaryCorrect, ...reading.summaryDistractors], correctAnswer: reading.summaryCorrect,
            hint: bilingual('Pick the option that includes the central idea, not one detail.', 'ஒரே விவரம் அல்ல, மைய கருத்தை கொண்ட விருப்பத்தை தேர்வு செய்.'),
            explanation: bilingual('A good summary captures main events and outcome.', 'சரியான சுருக்கம் முக்கிய நிகழ்வுகளையும் முடிவையும் எடுத்துரைக்கும்.'),
            transliteration: reading.transliteration, tamilScript: reading.summaryCorrect, passage, passageTitle: reading.title
        }));
    });
    return lessons;
};

const buildStage9 = () => {
    const lessons = [];
    let n = 1;
    const topics = [
        {
            en: 'Self introduction',
            ta: 'சுய அறிமுகம்',
            model: 'என் பெயர் குமார். நான் சென்னையில் வசிக்கிறேன். நான் மென்பொருள் பொறியாளராக வேலை செய்கிறேன்.',
            colloquial: 'என் பேர் குமார். நான் சென்னைல இருக்கேன். நான் சாப்ட்வேர் வேலை பாக்கறேன்.',
            wrong: 'என் பெயர் குமார் நான் சென்னையில் வசிக்கிறாய்.',
            ordered: ['என் பெயர் குமார்.', 'நான் சென்னையில் வசிக்கிறேன்.', 'நான் மென்பொருள் பொறியாளராக வேலை செய்கிறேன்.', 'எனக்கு தமிழ் கற்க விருப்பம் உள்ளது.'],
            transliteration: 'en peyar kumar naan chennaivil vasikkiren'
        },
        {
            en: 'Family description',
            ta: 'குடும்ப விளக்கம்',
            model: 'என் குடும்பத்தில் நான்கு பேர் உள்ளனர். அப்பா ஆசிரியர். அம்மா வங்கி ஊழியர்.',
            colloquial: 'எங்க வீட்டுல நாலு பேர் இருக்கோம். அப்பா டீச்சர். அம்மா வங்கிக்குப் போறாங்க.',
            wrong: 'என் குடும்பத்தில் நான்கு பேர் உள்ளான்.',
            ordered: ['என் குடும்பத்தில் நான்கு பேர் உள்ளனர்.', 'என் அப்பா ஆசிரியராக வேலை செய்கிறார்.', 'என் அம்மா வங்கியில் வேலை செய்கிறார்.', 'நாங்கள் எல்லோரும் சேர்ந்து இரவு உணவு சாப்பிடுகிறோம்.'],
            transliteration: 'en kudumbathil naangu per ullanar'
        },
        {
            en: 'Favorite food',
            ta: 'பிடித்த உணவு',
            model: 'எனக்கு தோசை மற்றும் சாம்பார் மிகவும் பிடிக்கும். வார இறுதியில் வீட்டில் இதை செய்வோம்.',
            colloquial: 'எனக்கு தோசை சாம்பார் ரொம்ப பிடிக்கும். வீக்கெண்ட்ல வீட்டிலேயே இதை பண்றோம்.',
            wrong: 'எனக்கு தோசை மிகவும் பிடிக்கிறது நான் சாப்பிடுவேன் தினமும்.',
            ordered: ['எனக்கு தோசை மிகவும் பிடிக்கும்.', 'அது சுவையாகவும் இலகுவாகவும் இருக்கும்.', 'வார இறுதியில் அம்மா அதை செய்வார்.', 'நாங்கள் எல்லோரும் சேர்ந்து சாப்பிடுவோம்.'],
            transliteration: 'enakku dosai migavum pidikkum'
        },
        {
            en: 'My daily routine',
            ta: 'என் நாள் ஒழுங்கு',
            model: 'நான் காலை ஆறு மணிக்கு எழுந்து உடற்பயிற்சி செய்கிறேன். பிறகு அலுவலகத்திற்கு செல்கிறேன்.',
            colloquial: 'நான் காலை ஆறு மணிக்கே எழுந்து எக்சர்சைஸ் பண்றேன். அப்புறம் ஆபீஸ்க்கு போறேன்.',
            wrong: 'நான் காலை எழுந்து உடற்பயிற்சி செய்கிறேன் பிறகு அலுவலகத்திற்கு செல்வேன் நேற்று.',
            ordered: ['நான் காலை ஆறு மணிக்கு எழுகிறேன்.', 'சிறிது நேரம் உடற்பயிற்சி செய்கிறேன்.', 'பிறகு காலை உணவு சாப்பிடுகிறேன்.', 'அதற்குப் பிறகு அலுவலகத்திற்கு செல்கிறேன்.'],
            transliteration: 'naan kaalai aaru manikku ezhugiren'
        },
        {
            en: 'My city',
            ta: 'என் நகரம்',
            model: 'என் நகரம் சுத்தமாகவும் பரபரப்பாகவும் உள்ளது. பொது போக்குவரத்து வசதிகள் நல்லவை.',
            colloquial: 'எங்க நகரம் சுத்தமாவும் ரொம்ப பிஸியாவும் இருக்கு. பப்ளிக் டிரான்ஸ்போர்ட் நல்லா இருக்கு.',
            wrong: 'என் நகரம் சுத்தமாக உள்ளது மக்கள் அதிகம் இல்லை மிகவும்.',
            ordered: ['என் நகரம் மிகவும் அழகாக உள்ளது.', 'இங்கு மக்கள் நட்பாக நடந்து கொள்கிறார்கள்.', 'போக்குவரத்து வசதிகள் பல உள்ளன.', 'மாலை நேரத்தில் கடற்கரைக்கு செல்ல நான் விரும்புகிறேன்.'],
            transliteration: 'en nagaram suthamaagavum paraparappaagavum ulladhu'
        },
        {
            en: 'My hobbies',
            ta: 'என் பொழுதுபோக்கு',
            model: 'எனக்கு ஓவியம் வரைவதும் புத்தகம் படிப்பதும் மிகவும் பிடிக்கும். விடுமுறை நாள்களில் இதற்காக நேரம் ஒதுக்குகிறேன்.',
            colloquial: 'எனக்கு டிராயிங் போட்றதும் புத்தகம் படிப்பதும் ரொம்ப பிடிக்கும். விடுமுறையில இதுக்காக நேரம் வைக்கிறேன்.',
            wrong: 'எனக்கு ஓவியம் வரைவதும் புத்தகம் படிப்பதும் பிடிக்கிறாய்.',
            ordered: ['எனக்கு ஓவியம் வரைவது பிடிக்கும்.', 'நேரம் கிடைக்கும் போது நான் புத்தகம் படிப்பேன்.', 'இந்த இரண்டு பொழுதுபோக்குகள் எனக்கு அமைதியை தருகின்றன.', 'வார இறுதியில் இதற்கு அதிக நேரம் செலவிடுகிறேன்.'],
            transliteration: 'en pozhudupokku oviyam varaivathu'
        },
        {
            en: 'Weekend plans',
            ta: 'வார இறுதி திட்டம்',
            model: 'இந்த வார இறுதியில் நான் குடும்பத்துடன் அருங்காட்சியகத்திற்கு செல்ல திட்டமிட்டுள்ளேன். பிறகு நண்பர்களை சந்திக்கவும் நினைக்கிறேன்.',
            colloquial: 'இந்த வீக்கெண்ட் நான் குடும்பத்தோட மியூசியம் போக திட்டமிட்டிருக்கேன். அப்புறம் நண்பர்களையும் சந்திக்கலாம் நினைக்கிறேன்.',
            wrong: 'இந்த வார இறுதியில் நான் குடும்பத்துடன் அருங்காட்சியகத்திற்கு சென்றேன் நாளை.',
            ordered: ['இந்த வார இறுதியில் நான் வெளியே செல்ல திட்டமிடுகிறேன்.', 'முதலில் குடும்பத்துடன் அருங்காட்சியகத்திற்கு போவோம்.', 'பிறகு நண்பர்களை சந்தித்து சிறிது நேரம் பேசுவேன்.', 'மாலை வீட்டிற்கு திரும்பி அடுத்த வாரத்துக்குத் தயாராகுவேன்.'],
            transliteration: 'vaara irudhi thittam'
        }
    ];
    topics.forEach((topic) => {
        const orderedParagraph = topic.ordered.join(' ');
        const optionTwo = [topic.ordered[0], topic.ordered[2], topic.ordered[1], topic.ordered[3]].join(' ');
        const optionThree = [topic.ordered[1], topic.ordered[0], topic.ordered[2], topic.ordered[3]].join(' ');
        const optionFour = [topic.ordered[2], topic.ordered[0], topic.ordered[3], topic.ordered[1]].join(' ');

        lessons.push(makeLesson({
            stage: 9, stageOrder: n++, difficulty: n === 2 ? 'Beginner' : undefined, exerciseType: 'translation_input',
            question: `${topic.en}: write in Tamil`, questionTamil: `${topic.ta}: தமிழில் எழுது`,
            correctAnswer: topic.model, modelAnswer: topic.model, acceptedAnswers: [topic.model, topic.colloquial],
            hint: bilingual('Write 2-3 meaningful Tamil sentences using correct verb endings.', 'சரியான வினை முடிவுகளுடன் 2-3 அர்த்தமுள்ள தமிழ் வாக்கியங்கள் எழுதுங்கள்.'),
            explanation: bilingual('Formal and colloquial variants are accepted when meaning is clear.', 'அர்த்தம் தெளிவாக இருந்தால் முறையானதும் வழக்குச் சொல்லும் ஏற்றுக்கொள்ளப்படும்.'),
            transliteration: topic.transliteration,
            tamilScript: topic.model,
            writingPrompt: `Write a short Tamil paragraph about: ${topic.en}.`
        }));
        lessons.push(makeLesson({
            stage: 9, stageOrder: n++, exerciseType: 'sequence_order',
            modelAnswer: topic.model, acceptedAnswers: [topic.model, topic.colloquial],
            question: `${topic.en}: choose the logically ordered paragraph`,
            questionTamil: `${topic.ta}: தர்க்கரீதியான சரியான பத்தி வரிசையை தேர்வு செய்`,
            options: [orderedParagraph, optionTwo, optionThree, optionFour],
            correctAnswer: orderedParagraph,
            hint: bilingual('Pick the paragraph that starts with topic introduction and ends with a natural closing idea.', 'தலைப்பு அறிமுகத்துடன் தொடங்கி இயல்பான முடிவுடன் நிறைவடையும் பத்தியை தேர்வு செய்.'),
            explanation: bilingual('Good writing follows coherent idea progression.', 'நல்ல எழுத்து தெளிவான கருத்து வரிசையைப் பின்பற்றும்.'),
            transliteration: topic.transliteration,
            tamilScript: orderedParagraph,
            dragItems: topic.ordered,
            dragTargets: ['1', '2', '3', '4'],
            correctOrder: [0, 1, 2, 3]
        }));
        lessons.push(makeLesson({
            stage: 9, stageOrder: n++, exerciseType: 'error_spot',
            modelAnswer: topic.model, acceptedAnswers: [topic.model, topic.colloquial],
            question: `${topic.en}: correct this sentence -> ${topic.wrong}`,
            questionTamil: `${topic.ta}: இந்த வாக்கியத்தைச் சரிசெய் -> ${topic.wrong}`,
            options: [topic.model, topic.colloquial, topic.wrong, topic.ordered[0]],
            correctAnswer: topic.model,
            hint: bilingual('Check tense and subject-verb agreement carefully.', 'காலம் மற்றும் பொருள்-வினை ஒத்திசையை கவனமாக சரிபார்.'),
            explanation: bilingual('The corrected sentence should be grammatically complete and context-appropriate.', 'சரிசெய்யப்பட்ட வாக்கியம் இலக்கண ரீதியாக முழுமையாகவும் சூழலுக்கு பொருந்துமாகவும் இருக்க வேண்டும்.'),
            transliteration: topic.transliteration,
            tamilScript: topic.model
        }));
        lessons.push(makeLesson({
            stage: 9, stageOrder: n++, exerciseType: 'free_write',
            question: `${topic.en}: free write`, questionTamil: `${topic.ta}: சுதந்திரமாக எழுதுங்கள்`,
            correctAnswer: topic.model, modelAnswer: topic.model, acceptedAnswers: [topic.model, topic.colloquial],
            hint: bilingual('Write 3-4 connected sentences; include one detail and one personal opinion.', '3-4 தொடர்புடைய வாக்கியங்கள் எழுது; ஒரு விவரமும் ஒரு தனிப்பட்ட கருத்தும் சேர்க்கவும்.'),
            explanation: bilingual('Model answer supports self-evaluation for grammar, flow, and vocabulary choice.', 'மாதிரி பதில் இலக்கணம், கருத்தோட்டம், சொற்தேர்வு ஆகியவற்றை சுயமாக மதிப்பிட உதவும்.'),
            transliteration: topic.transliteration,
            tamilScript: topic.model,
            writingPrompt: `Write a short Tamil paragraph about ${topic.en}. Include at least 3 sentences.`
        }));
    });
    return lessons;
};

const buildMasteryQuestionsByStage = (stageNumber) => {
    const questions = [];
    const addQuestion = ({
        question,
        questionTamil = '',
        options,
        correctAnswer,
        exerciseType = 'text_mcq',
        transliteration = ''
    }) => {
        questions.push({
            question,
            questionTamil,
            options,
            correctAnswer,
            exerciseType,
            transliteration
        });
    };

    if (stageNumber === 1) {
        for (let i = 0; i < 10; i += 1) {
            const [ta, tr] = VOWELS[i % VOWELS.length];
            const distractors = cycleWindow(VOWELS, i + 1, 3).map((item) => item[0]);
            addQuestion({
                question: `Select the Tamil vowel for "${tr}"`,
                questionTamil: `"${tr}" என்பதற்கான உயிரெழுத்தை தேர்வு செய்`,
                options: [ta, ...distractors],
                correctAnswer: ta,
                exerciseType: 'audio_mcq',
                transliteration: tr
            });
        }
        for (let i = 0; i < 10; i += 1) {
            const [ta, tr] = VOWELS[i % VOWELS.length];
            const distractors = cycleWindow(VOWELS, i + 2, 3).map((item) => item[1]);
            addQuestion({
                question: `Choose transliteration of "${ta}"`,
                questionTamil: `"${ta}" என்பதன் ஒலிபெயர்ப்பை தேர்வு செய்`,
                options: [tr, ...distractors],
                correctAnswer: tr,
                exerciseType: 'text_mcq',
                transliteration: tr
            });
        }
    } else if (stageNumber === 2) {
        for (let i = 0; i < 10; i += 1) {
            const [sym, , tr] = CONSONANTS[i % CONSONANTS.length];
            const distractors = cycleWindow(CONSONANTS, i + 1, 3).map((item) => item[0]);
            addQuestion({
                question: `Pick consonant for "${tr}"`,
                questionTamil: `"${tr}" ஒலிக்கான மெய்யெழுத்தை தேர்வு செய்`,
                options: [sym, ...distractors],
                correctAnswer: sym,
                exerciseType: 'audio_mcq',
                transliteration: tr
            });
        }
        for (let i = 0; i < 10; i += 1) {
            const [sym, , tr] = CONSONANTS[(i + 4) % CONSONANTS.length];
            const distractors = cycleWindow(CONSONANTS, i + 6, 3).map((item) => item[2]);
            addQuestion({
                question: `Choose transliteration for "${sym}"`,
                questionTamil: `"${sym}" என்பதன் ஒலிபெயர்ப்பு எது?`,
                options: [tr, ...distractors],
                correctAnswer: tr,
                exerciseType: 'text_mcq',
                transliteration: tr
            });
        }
    } else if (stageNumber === 3) {
        for (let i = 0; i < 20; i += 1) {
            const [, base, tr] = CONSONANTS[i % CONSONANTS.length];
            const [vTa, vTr] = VOWELS[i % VOWELS.length];
            const correctCombo = buildUyirmei(base, vTr);
            const distractors = [
                buildUyirmei(base, VOWELS[(i + 1) % VOWELS.length][1]),
                buildUyirmei(base, VOWELS[(i + 2) % VOWELS.length][1]),
                buildUyirmei(CONSONANTS[(i + 1) % CONSONANTS.length][1], vTr)
            ];
            addQuestion({
                question: `Choose uyirmei for ${tr} + ${vTr}`,
                questionTamil: `${tr} + ${vTr} க்கு சரியான உயிர்மெய் எது?`,
                options: [correctCombo, ...distractors],
                correctAnswer: correctCombo,
                exerciseType: 'text_mcq',
                transliteration: `${tr}${vTr}`
            });
        }
    } else if (stageNumber === 4) {
        const numbers = [
            ['ஒன்று', 'one', 'ondru'], ['இரண்டு', 'two', 'irandu'], ['மூன்று', 'three', 'moondru'], ['நான்கு', 'four', 'naanku'], ['ஐந்து', 'five', 'aindhu'],
            ['ஆறு', 'six', 'aaru'], ['ஏழு', 'seven', 'ezhu'], ['எட்டு', 'eight', 'ettu'], ['ஒன்பது', 'nine', 'onbadhu'], ['பத்து', 'ten', 'paththu']
        ];
        const days = [
            ['திங்கள்', 'Monday'], ['செவ்வாய்', 'Tuesday'], ['புதன்', 'Wednesday'], ['வியாழன்', 'Thursday'], ['வெள்ளி', 'Friday']
        ];
        const months = [
            ['ஜனவரி', 'January'], ['பிப்ரவரி', 'February'], ['மார்ச்', 'March'], ['ஏப்ரல்', 'April'], ['மே', 'May']
        ];
        const times = ['06:00', '08:30', '12:15', '15:45', '20:00'];

        for (let i = 0; i < 5; i += 1) {
            const [ta, en, tr] = numbers[i];
            const distractors = cycleWindow(numbers, i + 1, 3).map((item) => item[0]);
            addQuestion({
                question: `Select Tamil for ${en}`,
                questionTamil: `${en} என்பதற்கான தமிழ் எண் எது?`,
                options: [ta, ...distractors],
                correctAnswer: ta,
                exerciseType: 'audio_mcq',
                transliteration: tr
            });
        }
        for (let i = 0; i < 5; i += 1) {
            const [ta, en] = days[i];
            const distractors = cycleWindow(days, i + 1, 3).map((item) => item[0]);
            addQuestion({
                question: `Tamil word for ${en}`,
                questionTamil: `${en} க்கு தமிழ் வாரநாள் எது?`,
                options: [ta, ...distractors],
                correctAnswer: ta
            });
        }
        for (let i = 0; i < 5; i += 1) {
            const [ta, en] = months[i];
            const distractors = cycleWindow(months, i + 1, 3).map((item) => item[0]);
            addQuestion({
                question: `Choose Tamil month for ${en}`,
                questionTamil: `${en} மாதத்திற்கு தமிழ் பெயர் எது?`,
                options: [ta, ...distractors],
                correctAnswer: ta
            });
        }
        for (let i = 0; i < 5; i += 1) {
            const time = times[i];
            const correct = `இப்போது மணி ${time}`;
            addQuestion({
                question: `Pick Tamil expression for ${time}`,
                questionTamil: `${time} நேரத்தைச் சொல்வதற்கான சரியான தமிழ் எது?`,
                options: [correct, `மணி ${time} இல்லை`, `நேற்று மணி ${time}`, `இன்று ${time} மட்டும்`],
                correctAnswer: correct
            });
        }
    } else if (stageNumber === 5) {
        const vocabPool = VOCAB_SETS.flatMap(([, , words]) => words);
        for (let i = 0; i < 20; i += 1) {
            const target = vocabPool[(i * 3) % vocabPool.length];
            const distractors = cycleWindow(vocabPool, (i * 3) + 1, 3).map((word) => word[1]);
            addQuestion({
                question: `Meaning of "${target[0]}"`,
                questionTamil: `"${target[0]}" என்பதன் பொருள் எது?`,
                options: [target[1], ...distractors],
                correctAnswer: target[1],
                transliteration: target[2]
            });
        }
    } else if (stageNumber === 6) {
        const grammar = [
            { subject: 'நான்', object: 'புத்தகம்', present: 'படிக்கிறேன்', past: 'படித்தேன்' },
            { subject: 'அவன்', object: 'சாதம்', present: 'சாப்பிடுகிறான்', past: 'சாப்பிட்டான்' },
            { subject: 'அவள்', object: 'தண்ணீர்', present: 'குடிக்கிறாள்', past: 'குடித்தாள்' },
            { subject: 'நாங்கள்', object: 'பள்ளிக்கு', present: 'செல்கிறோம்', past: 'சென்றோம்' },
            { subject: 'அவர்கள்', object: 'தமிழ்', present: 'பேசுகிறார்கள்', past: 'பேசினர்' },
            { subject: 'நீங்கள்', object: 'வேலைக்கு', present: 'வருகிறீர்கள்', past: 'வந்தீர்கள்' },
            { subject: 'நீ', object: 'கதை', present: 'எழுதுகிறாய்', past: 'எழுதியாய்' },
            { subject: 'அவர்', object: 'நூலகத்தில்', present: 'உட்கார்கிறார்', past: 'உட்கார்ந்தார்' },
            { subject: 'மாணவர்கள்', object: 'பாடம்', present: 'கற்கிறார்கள்', past: 'கற்றார்கள்' },
            { subject: 'நாய்', object: 'பால்', present: 'குடிக்கிறது', past: 'குடித்தது' }
        ];

        grammar.forEach((item) => {
            const correct = `${item.subject} ${item.object} ${item.present}`;
            addQuestion({
                question: 'Select the correct SOV sentence',
                questionTamil: 'சரியான SOV வாக்கியத்தை தேர்வு செய்',
                options: [
                    correct,
                    `${item.object} ${item.subject} ${item.present}`,
                    `${item.subject} ${item.present} ${item.object}`,
                    `${item.present} ${item.subject} ${item.object}`
                ],
                correctAnswer: correct
            });

            const pastSentence = `${item.subject} ${item.object} ${item.past}`;
            addQuestion({
                question: `Convert to past tense: ${correct}`,
                questionTamil: `கடந்த காலமாக மாற்று: ${correct}`,
                options: [
                    pastSentence,
                    `${item.subject} ${item.object} ${item.present}`,
                    `${item.subject} ${item.object} இல்லை`,
                    `${item.object} ${item.subject} ${item.past}`
                ],
                correctAnswer: pastSentence
            });
        });
    } else if (stageNumber === 7) {
        const dialogueSet = [
            ['வணக்கம்! உங்கள் பெயர் என்ன?', 'வணக்கம். என் பெயர் அருண்.'],
            ['உங்களுக்கு என்ன வேண்டும்?', 'எனக்கு ஒரு தோசை வேண்டும்.'],
            ['ரயில் நிலையம் எங்கே?', 'நேராக சென்று வலப்பக்கம் திரும்புங்கள்.'],
            ['இது எவ்வளவு?', 'இது நூறு ரூபாய்.'],
            ['என்ன பிரச்சனை?', 'எனக்கு தலைவலி இருக்கிறது.'],
            ['பஸ் எத்தனை மணிக்கு?', 'ஆறு முப்பது மணிக்கு வரும்.'],
            ['நீர் வேண்டுமா?', 'ஆம், ஒரு கண்ணாடி தண்ணீர் வேண்டும்.'],
            ['இங்கே உட்காரலாமா?', 'ஆம், தயவு செய்து உட்காருங்கள்.'],
            ['இந்த முகவரி எங்கே?', 'அடுத்த தெருவில் இடப்பக்கம் உள்ளது.'],
            ['கட்டணம் எவ்வளவு?', 'மொத்தம் இருநூறு ரூபாய்.']
        ];

        dialogueSet.forEach(([prompt, best]) => {
            addQuestion({
                question: `Best response: ${prompt}`,
                questionTamil: `${prompt} என்ற கேள்விக்கு சிறந்த பதில் எது?`,
                options: [best, 'தெரியாது.', 'பிறகு பேசலாம்.', 'இப்போது முடியாது.'],
                correctAnswer: best,
                exerciseType: 'role_play_mcq'
            });
            addQuestion({
                question: `Choose the polite form for: ${best}`,
                questionTamil: `${best} என்பதற்கான மரியாதையான வடிவத்தை தேர்வு செய்`,
                options: [best, best.replace('வேண்டும்', 'வேணும்'), 'ஹும்.', 'பார்ப்போம்.'],
                correctAnswer: best
            });
        });
    } else if (stageNumber === 8) {
        const statements = [
            ['பகுதியில் மாணவர்கள் மரநடுகை செய்தனர்.', 'True'],
            ['மருத்துவ முகாம் ரத்து செய்யப்பட்டது.', 'False'],
            ['வாசிப்பு வட்டத்தில் கதைகள் பற்றி பேசப்பட்டது.', 'True'],
            ['கடற்கரை சுத்தம் திட்டத்தில் யாரும் கலந்துகொள்ளவில்லை.', 'False'],
            ['சுயஉதவி குழு கடன் உதவி வழங்கியது.', 'True'],
            ['நகராட்சி இதழில் எந்த செய்தியும் இல்லை.', 'False'],
            ['சந்தை பயணத்தில் காய்கறி வாங்கப்பட்டது.', 'True'],
            ['பள்ளி நூலகம் அந்த நாளில் மூடப்பட்டது.', 'False'],
            ['மழை நாளில் குழந்தைகள் மகிழ்ந்தனர்.', 'True'],
            ['பேருந்து எப்போதும் காலியாகவே வந்தது.', 'False']
        ];

        statements.forEach(([statement, answer]) => {
            addQuestion({
                question: `True or False: ${statement}`,
                questionTamil: `உண்மை அல்லது பொய்: ${statement}`,
                options: ['True', 'False', 'Not given', 'Both'],
                correctAnswer: answer,
                exerciseType: 'true_false'
            });
        });

        for (let i = 0; i < 10; i += 1) {
            addQuestion({
                question: 'Choose the best reading summary',
                questionTamil: 'சிறந்த வாசிப்பு சுருக்கத்தை தேர்வு செய்',
                options: [
                    'மைய கருத்தை தெளிவாக சொல்லும் சுருக்கம்',
                    'ஒரே ஒரு சிறு விவரத்தை மட்டும் கூறும் பதில்',
                    'பகுதிக்கு சம்பந்தமில்லாத கருத்து',
                    'பகுதியை எதிர்மாறாக விளக்கும் பதில்'
                ],
                correctAnswer: 'மைய கருத்தை தெளிவாக சொல்லும் சுருக்கம்',
                exerciseType: 'comprehension_mcq'
            });
        }
    } else if (stageNumber === 9) {
        const writingSet = [
            ['என் பெயர் லதா. நான் மதுரையில் வசிக்கிறேன்.', 'என் பேர் லதா. நான் மதுரைல இருக்கேன்.', 'என் பெயர் லதா நான் மதுரையில் வசிக்கிறாய்.'],
            ['என் குடும்பத்தில் ஐந்து பேர் உள்ளனர்.', 'எங்க வீட்டுல ஐந்து பேர் இருக்காங்க.', 'என் குடும்பத்தில் ஐந்து பேர் உள்ளான்.'],
            ['எனக்கு இட்லி மற்றும் சாம்பார் பிடிக்கும்.', 'எனக்கு இட்லி சாம்பார் ரொம்ப பிடிக்கும்.', 'எனக்கு இட்லி பிடிக்கும் நான் சாப்பிடவில்லை.'],
            ['நான் காலை எழுந்து உடற்பயிற்சி செய்கிறேன்.', 'நான் காலை எழுந்து எக்சர்சைஸ் பண்றேன்.', 'நான் காலை எழுந்து உடற்பயிற்சி செய்கிறாய்.'],
            ['என் நகரத்தில் நல்ல போக்குவரத்து வசதி உள்ளது.', 'எங்க நகரத்துல போக்குவரத்து நல்லா இருக்கு.', 'என் நகரத்தில் நல்ல போக்குவரத்து வசதி உள்ளேன்.'],
            ['நான் தமிழ் கற்றுக்கொண்டு தினமும் பயிற்சி செய்கிறேன்.', 'நான் தமிழ் கத்துக்கிட்டு தினமும் பிராக்டிஸ் பண்றேன்.', 'நான் தமிழ் கற்றுக்கொண்டு தினமும் பயிற்சி செய்கிறாய்.'],
            ['விடுமுறையில் நான் குடும்பத்துடன் கோவிலுக்கு சென்றேன்.', 'விடுமுறையில் நாங்க கோவிலுக்கு போனோம்.', 'விடுமுறையில் நான் குடும்பத்துடன் கோவிலுக்கு சென்றாய்.'],
            ['என் நண்பர் மிகவும் உதவிகரமாக இருக்கிறார்.', 'என் பிரண்ட் ரொம்ப ஹெல்ப் பண்றவர்.', 'என் நண்பர் மிகவும் உதவிகரமாக இருக்கிறேன்.'],
            ['நான் தினமும் செய்திகளை வாசிக்கிறேன்.', 'நான் தினமும் நியூஸ் படிக்கறேன்.', 'நான் தினமும் செய்திகளை வாசிக்கிறாய்.'],
            ['தமிழில் எழுதுவதால் எனக்கு நம்பிக்கை வருகிறது.', 'தமிழ்ல எழுதினா எனக்கு கான்பிடன்ஸ் வருது.', 'தமிழில் எழுதுவதால் எனக்கு நம்பிக்கை வருகிறேன்.']
        ];

        writingSet.forEach(([formal, colloquial, wrong]) => {
            addQuestion({
                question: `Choose the grammatically correct sentence: ${wrong}`,
                questionTamil: `இலக்கண ரீதியாக சரியான வாக்கியத்தை தேர்வு செய்: ${wrong}`,
                options: [formal, colloquial, wrong, 'இது சரி அல்ல'],
                correctAnswer: formal,
                exerciseType: 'error_spot'
            });
            addQuestion({
                question: 'Choose an acceptable colloquial variant',
                questionTamil: 'ஏற்றுக்கொள்ளக்கூடிய வழக்குச் சொல் வடிவத்தை தேர்வு செய்',
                options: [colloquial, wrong, 'பொருள் இல்லாத வாக்கியம்', 'அர்த்தமற்ற சொல் சேர்க்கை'],
                correctAnswer: colloquial,
                exerciseType: 'translation_input'
            });
        });
    } else {
        const mixed = [];
        for (let stage = 1; stage <= 9; stage += 1) {
            mixed.push(...buildMasteryQuestionsByStage(stage).slice(0, 2));
        }
        mixed.push({
            question: 'Choose the best overall strategy to improve Tamil fluency',
            questionTamil: 'தமிழ் சரளத்தை மேம்படுத்த சிறந்த திட்டம் எது?',
            options: [
                'தினசரி கேட்பு, வாசிப்பு, எழுதுதல், மற்றும் உரையாடல் பயிற்சி',
                'வாரத்தில் ஒருமுறை மட்டும் சொற்களை மனப்பாடம் செய்தல்',
                'தவறுகளைத் தவிர்க்க பேசாமல் இருப்பது',
                'மொழிபெயர்ப்பு இல்லாமல் சீரற்ற சொற்கள் மட்டும் படித்தல்'
            ],
            correctAnswer: 'தினசரி கேட்பு, வாசிப்பு, எழுதுதல், மற்றும் உரையாடல் பயிற்சி',
            exerciseType: 'mastery_test',
            transliteration: 'thinasari payirchi mukkiyam'
        });
        mixed.push({
            question: 'Final checkpoint: what score unlocks the next stage?',
            questionTamil: 'அடுத்த நிலை திறக்க குறைந்தபட்ச மதிப்பெண் எவ்வளவு?',
            options: ['70%', '50%', '60%', '90%'],
            correctAnswer: '70%',
            exerciseType: 'mastery_test',
            transliteration: 'ezhupathu sadha vidham'
        });

        mixed.slice(0, 20).forEach((question) => addQuestion(question));
    }

    return questions.slice(0, 20);
};

const buildStage10 = () => {
    const lessons = [];
    let n = 1;
    for (let stage = 1; stage <= 9; stage += 1) {
        lessons.push(makeLesson({
            stage: 10, stageOrder: n++, difficulty: stage === 1 ? 'Beginner' : 'Advanced', exerciseType: 'mastery_test',
            question: `Mastery Test: Stage ${stage}`, questionTamil: `தேர்ச்சி தேர்வு: நிலை ${stage}`,
            options: ['Start Test', 'Review', 'Later', 'Skip'], correctAnswer: 'Start Test',
            hint: bilingual('No hints in mastery tests.', 'தேர்ச்சி தேர்வில் குறிப்பு இல்லை.'),
            explanation: bilingual('Score 70%+ to unlock the next stage.', 'அடுத்த நிலை திறக்க 70% மேல் பெற வேண்டும்.'),
            transliteration: `nilai ${stage} therchi`,
            tamilScript: `நிலை ${stage} தேர்ச்சி`,
            questions: buildMasteryQuestionsByStage(stage),
            isMasteryTest: true,
            unlocksStage: stage + 1,
            audioKey: `mastery-${stage}`
        }));
    }
    lessons.push(makeLesson({
        stage: 10, stageOrder: n++, difficulty: 'Advanced', exerciseType: 'mastery_test',
        question: 'Final Tamil Fluency Test', questionTamil: 'இறுதி தமிழ் சரளத் தேர்வு',
        options: ['Start Final Test', 'Review Stage 9', 'Later', 'Exit'], correctAnswer: 'Start Final Test',
        hint: bilingual('No hints; timed test.', 'குறிப்பு இல்லை; நேர கட்டுப்பாடு உண்டு.'),
        explanation: bilingual('Passing confirms full curriculum fluency.', 'வெற்றிகரமாக முடித்தால் முழு பாடத்திட்ட சரளம் நிரூபிக்கப்படுகிறது.'),
        transliteration: 'irudi tamil sarala thervu',
        tamilScript: 'இறுதி தமிழ் சரளத் தேர்வு',
        questions: buildMasteryQuestionsByStage(10),
        isMasteryTest: true,
        culturalNote: bilingual('Successful learners receive a fluency certificate.', 'வெற்றியாளர்களுக்கு சரளச் சான்றிதழ் வழங்கப்படும்.')
    }));
    return lessons;
};

const buildLessons = () => {
    const stage1Lessons = buildStage1();
    const stage2Lessons = buildStage2();
    const stage3Lessons = buildStage3();
    const stage4Lessons = buildStage4();
    const stage5Lessons = buildStage5();
    const stage6Lessons = buildStage6();
    const stage7Lessons = buildStage7();
    const stage8Lessons = buildStage8();
    const stage9Lessons = buildStage9();
    const stage10Lessons = buildStage10();

    const lessons = [
        ...stage1Lessons,
        ...stage2Lessons,
        ...stage3Lessons,
        ...stage4Lessons,
        ...stage5Lessons,
        ...stage6Lessons,
        ...stage7Lessons,
        ...stage8Lessons,
        ...stage9Lessons,
        ...stage10Lessons
    ];

    const expected = { 1: 36, 2: 36, 3: 54, 4: 27, 5: 40, 6: 40, 7: 32, 8: 30, 9: 28, 10: 10 };
    Object.entries(expected).forEach(([stage, count]) => {
        const actual = lessons.filter((lesson) => lesson.stage === Number(stage)).length;
        if (actual !== count) throw new Error(`Stage ${stage} expected ${count} but got ${actual}`);
    });
    if (lessons.length !== 333) throw new Error(`Expected 333 lessons but got ${lessons.length}`);
    return normalizeNFC(lessons);
};

async function seed() {
    const lessons = buildLessons();

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        await Lesson.deleteMany({});
        console.log('Cleared existing lessons');

        await Lesson.insertMany(lessons);
        console.log(`Seeded ${lessons.length} Tamil lessons successfully.`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    seed();
}

module.exports = {
    buildLessons,
    normalizeNFC
};

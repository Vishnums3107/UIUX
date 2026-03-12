/**
 * Database Seed Script
 * Seeds Tamil lessons across all categories and difficulty levels
 * Run: node seed.js
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Lesson = require('./models/Lesson');

const lessons = [
    // ═══════════════════════════════════════════════
    // UYIR EZHUTHUKKAL (Vowels) — 12 letters
    // ═══════════════════════════════════════════════

    // Beginner - Uyir
    {
        category: 'uyir',
        difficulty: 'Beginner',
        type: 'mcq',
        question: 'Which letter produces the "a" sound?',
        question_tamil: '"அ" ஒலியை உருவாக்கும் எழுத்து எது?',
        correct_answer: 'அ',
        options: ['அ', 'ஆ', 'இ', 'ஈ'],
        hint: 'It is the first letter of the Tamil alphabet.',
        explanation: 'அ (a) is the first short vowel.',
        audio_url: '/audio/uyir/a.mp3'
    },
    {
        category: 'uyir',
        difficulty: 'Beginner',
        type: 'mcq',
        question: 'Which letter produces the "aa" sound?',
        question_tamil: '"ஆ" ஒலியை உருவாக்கும் எழுத்து எது?',
        correct_answer: 'ஆ',
        options: ['அ', 'ஆ', 'இ', 'ஈ'],
        hint: 'It is the first long vowel.',
        explanation: 'ஆ (aa) is the long form of அ.',
        audio_url: '/audio/uyir/aa.mp3'
    },
    {
        category: 'uyir', difficulty: 'Beginner', type: 'mcq', order: 3,
        question: 'Identify the Tamil vowel for the "i" sound.',
        question_tamil: '"இ" ஒலிக்கான உயிர் எழுத்தை அடையாளம் காணுங்கள்.',
        options: ['உ', 'இ', 'எ', 'ஒ'], correct_answer: 'இ',
        hint: 'Short "i" as in "it".',
        explanation: 'இ (i) is the short vowel for the "i" sound.'
    },
    {
        category: 'uyir', difficulty: 'Beginner', type: 'mcq', order: 4,
        question: 'How many Uyir Ezhuthukkal (vowels) are there in Tamil?',
        question_tamil: 'தமிழில் எத்தனை உயிர் எழுத்துக்கள் உள்ளன?',
        options: ['10', '12', '18', '8'], correct_answer: '12',
        hint: 'It is more than 10 but less than 15.',
        explanation: 'Tamil has 12 vowels: அ, ஆ, இ, ஈ, உ, ஊ, எ, ஏ, ஐ, ஒ, ஓ, ஔ.'
    },
    {
        category: 'uyir', difficulty: 'Beginner', type: 'mcq', order: 5,
        question: 'Which of these is the Tamil vowel "u"?',
        question_tamil: '"உ" என்ற தமிழ் உயிர் எழுத்து எது?',
        options: ['ஊ', 'உ', 'ஒ', 'ஓ'], correct_answer: 'உ',
        hint: 'Short "u" as in "put".',
        explanation: 'உ (u) is the short vowel, while ஊ (uu) is the long form.'
    },

    // Intermediate - Uyir
    {
        category: 'uyir', difficulty: 'Intermediate', type: 'text', order: 1,
        question: 'Type the Tamil vowel that makes the "ai" sound.',
        question_tamil: '"ஐ" ஒலியை உருவாக்கும் தமிழ் உயிர் எழுத்தை தட்டச்சு செய்யுங்கள்.',
        options: [], correct_answer: 'ஐ',
        hint: 'It sounds like "eye" in English.',
        explanation: 'ஐ (ai) is the 9th Tamil vowel.'
    },
    {
        category: 'uyir', difficulty: 'Intermediate', type: 'text', order: 2,
        question: 'Type all 12 Tamil vowels separated by commas.',
        question_tamil: '12 தமிழ் உயிர் எழுத்துக்களை கமாவால் பிரித்து தட்டச்சு செய்யுங்கள்.',
        options: [], correct_answer: 'அ,ஆ,இ,ஈ,உ,ஊ,எ,ஏ,ஐ,ஒ,ஓ,ஔ',
        hint: 'Start with அ and end with ஔ.',
        explanation: 'The 12 Tamil vowels in order: அ, ஆ, இ, ஈ, உ, ஊ, எ, ஏ, ஐ, ஒ, ஓ, ஔ.'
    },
    {
        category: 'uyir', difficulty: 'Intermediate', type: 'mcq', order: 3,
        question: 'Which pair represents short and long forms of the same vowel?',
        question_tamil: 'ஒரே உயிர் எழுத்தின் குறில் மற்றும் நெடில் வடிவங்களை எது குறிக்கிறது?',
        options: ['அ-ஆ', 'அ-இ', 'எ-ஒ', 'உ-ஐ'], correct_answer: 'அ-ஆ',
        hint: 'Short and long of the first vowel.',
        explanation: 'Tamil vowels come in short-long pairs: அ/ஆ, இ/ஈ, உ/ஊ, எ/ஏ, ஒ/ஓ.'
    },

    // Advanced - Uyir
    {
        category: 'uyir', difficulty: 'Advanced', type: 'text', order: 1,
        question: 'What are the 5 short vowels (kuril) in Tamil? Type them separated by commas.',
        question_tamil: 'தமிழில் 5 குறில் உயிர் எழுத்துக்கள் யாவை?',
        options: [], correct_answer: 'அ,இ,உ,எ,ஒ',
        hint: 'These are the shorter duration vowels.',
        explanation: 'The 5 short vowels (குறில்): அ, இ, உ, எ, ஒ.'
    },
    {
        category: 'uyir', difficulty: 'Advanced', type: 'text', order: 2,
        question: 'What are the 7 long vowels (nedil) in Tamil? Type them separated by commas.',
        question_tamil: 'தமிழில் 7 நெடில் உயிர் எழுத்துக்கள் யாவை?',
        options: [], correct_answer: 'ஆ,ஈ,ஊ,ஏ,ஐ,ஓ,ஔ',
        hint: 'These include the long pairs plus ஐ and ஔ.',
        explanation: 'The 7 long vowels (நெடில்): ஆ, ஈ, ஊ, ஏ, ஐ, ஓ, ஔ.'
    },

    // ═══════════════════════════════════════════════
    // MEI EZHUTHUKKAL (Consonants) — 18 letters
    // ═══════════════════════════════════════════════

    // Beginner - Mei
    {
        category: 'mei', difficulty: 'Beginner', type: 'mcq', order: 1,
        question: 'What is the first Tamil consonant?',
        question_tamil: 'முதல் தமிழ் மெய் எழுத்து எது?',
        options: ['க்', 'ங்', 'ச்', 'ந்'], correct_answer: 'க்',
        hint: 'It sounds like "k".',
        explanation: 'க் (k) is the first of 18 Tamil consonants (மெய் எழுத்துக்கள்).'
    },
    {
        category: 'mei', difficulty: 'Beginner', type: 'mcq', order: 2,
        question: 'How many Mei Ezhuthukkal (consonants) are there in Tamil?',
        question_tamil: 'தமிழில் எத்தனை மெய் எழுத்துக்கள் உள்ளன?',
        options: ['12', '16', '18', '20'], correct_answer: '18',
        hint: 'It is between 15 and 20.',
        explanation: 'Tamil has 18 consonants: க், ங், ச், ஞ், ட், ண், த், ந், ப், ம், ய், ர், ல், வ், ழ், ள், ற், ன்.'
    },
    {
        category: 'mei', difficulty: 'Beginner', type: 'mcq', order: 3,
        question: 'Which Tamil consonant makes the "m" sound?',
        question_tamil: '"ம" ஒலியை உருவாக்கும் தமிழ் மெய் எழுத்து எது?',
        options: ['ந்', 'ம்', 'ன்', 'ண்'], correct_answer: 'ம்',
        hint: 'Think of the English letter "m".',
        explanation: 'ம் (m) is one of the nasal consonants in Tamil.'
    },
    {
        category: 'mei', difficulty: 'Beginner', type: 'mcq', order: 4,
        question: 'Which letter represents the "p" sound in Tamil?',
        question_tamil: '"ப" ஒலியை குறிக்கும் எழுத்து எது?',
        options: ['ப்', 'த்', 'க்', 'ட்'], correct_answer: 'ப்',
        hint: 'This consonant is in the "pa" group.',
        explanation: 'ப் (p) is the labial stop consonant.'
    },

    // Intermediate - Mei
    {
        category: 'mei', difficulty: 'Intermediate', type: 'mcq', order: 1,
        question: 'Tamil consonants are grouped into "varga" classes. Which group does "ச்" belong to?',
        question_tamil: '"ச்" எந்த வகுப்பைச் சேர்ந்தது?',
        options: ['ka-varga', 'ca-varga', 'ta-varga', 'pa-varga'], correct_answer: 'ca-varga',
        hint: 'It makes the "ch/s" sound.',
        explanation: 'ச் belongs to ca-varga (ச-வர்க்கம்): ச், ஞ்.'
    },
    {
        category: 'mei', difficulty: 'Intermediate', type: 'text', order: 2,
        question: 'Type the 6 "vallinam" (hard consonants) separated by commas.',
        question_tamil: '6 வல்லினம் மெய் எழுத்துக்களை கமாவால் பிரித்து எழுதுங்கள்.',
        options: [], correct_answer: 'க்,ச்,ட்,த்,ப்,ற்',
        hint: 'These are the "hard" or "strong" consonants.',
        explanation: 'The 6 vallinam (வல்லினம்): க், ச், ட், த், ப், ற்.'
    },
    {
        category: 'mei', difficulty: 'Intermediate', type: 'text', order: 3,
        question: 'Type the 6 "mellinam" (soft consonants) separated by commas.',
        question_tamil: '6 மெல்லினம் மெய் எழுத்துக்களை கமாவால் பிரித்து எழுதுங்கள்.',
        options: [], correct_answer: 'ங்,ஞ்,ண்,ந்,ம்,ன்',
        hint: 'These are the nasal consonants.',
        explanation: 'The 6 mellinam (மெல்லினம்): ங், ஞ், ண், ந், ம், ன்.'
    },

    // Advanced - Mei
    {
        category: 'mei', difficulty: 'Advanced', type: 'text', order: 1,
        question: 'Type all 18 Tamil consonants in order, separated by commas.',
        question_tamil: '18 தமிழ் மெய் எழுத்துக்களை வரிசையாக கமாவால் பிரித்து எழுதுங்கள்.',
        options: [], correct_answer: 'க்,ங்,ச்,ஞ்,ட்,ண்,த்,ந்,ப்,ம்,ய்,ர்,ல்,வ்,ழ்,ள்,ற்,ன்',
        hint: 'Start with க் and end with ன்.',
        explanation: 'The 18 Tamil consonants in traditional order.'
    },

    // ═══════════════════════════════════════════════
    // UYIR-MEI (Combined Letters)
    // ═══════════════════════════════════════════════

    // Beginner - Uyir-Mei
    {
        category: 'uyir-mei', difficulty: 'Beginner', type: 'mcq', order: 1,
        question: 'What letter is formed when க் combines with அ?',
        question_tamil: 'க் + அ = ?',
        options: ['க', 'கா', 'கி', 'கு'], correct_answer: 'க',
        hint: 'The consonant takes the inherent "a" sound.',
        explanation: 'க = க் + அ. This is how Uyir-Mei letters are formed.'
    },
    {
        category: 'uyir-mei', difficulty: 'Beginner', type: 'mcq', order: 2,
        question: 'What is க் + ஆ?',
        question_tamil: 'க் + ஆ = ?',
        options: ['க', 'கா', 'கி', 'கீ'], correct_answer: 'கா',
        hint: 'Add the long "aa" sound to "ka".',
        explanation: 'கா = க் + ஆ (kaa).'
    },
    {
        category: 'uyir-mei', difficulty: 'Beginner', type: 'mcq', order: 3,
        question: 'How many Uyir-Mei letters are there in Tamil?',
        question_tamil: 'தமிழில் உயிர்மெய் எழுத்துக்கள் எத்தனை?',
        options: ['108', '216', '247', '156'], correct_answer: '216',
        hint: '18 consonants × 12 vowels = ?',
        explanation: '18 consonants × 12 vowels = 216 Uyir-Mei combinations.'
    },
    {
        category: 'uyir-mei', difficulty: 'Beginner', type: 'mcq', order: 4,
        question: 'What is த் + இ?',
        question_tamil: 'த் + இ = ?',
        options: ['த', 'தா', 'தி', 'தீ'], correct_answer: 'தி',
        hint: 'Add the short "i" to "tha".',
        explanation: 'தி = த் + இ (thi).'
    },

    // Intermediate - Uyir-Mei
    {
        category: 'uyir-mei', difficulty: 'Intermediate', type: 'text', order: 1,
        question: 'Type the first 5 Uyir-Mei letters of the "ka" series: க, கா, கி, கீ, கு.',
        question_tamil: '"க" வரிசையின் முதல் 5 உயிர்மெய் எழுத்துக்களை தட்டச்சு செய்யுங்கள்.',
        options: [], correct_answer: 'க,கா,கி,கீ,கு',
        hint: 'க் + அ, ஆ, இ, ஈ, உ',
        explanation: 'The ka-series: க, கா, கி, கீ, கு, கூ, கெ, கே, கை, கொ, கோ, கௌ.'
    },
    {
        category: 'uyir-mei', difficulty: 'Intermediate', type: 'mcq', order: 2,
        question: 'Which Uyir-Mei letter is ப் + ஊ?',
        question_tamil: 'ப் + ஊ = ?',
        options: ['பு', 'பூ', 'பொ', 'போ'], correct_answer: 'பூ',
        hint: 'Long "oo" sound with "pa".',
        explanation: 'பூ = ப் + ஊ (poo).'
    },

    // Advanced - Uyir-Mei
    {
        category: 'uyir-mei', difficulty: 'Advanced', type: 'text', order: 1,
        question: 'Decompose the word "தமிழ்" into its component letters.',
        question_tamil: '"தமிழ்" என்ற சொல்லை அதன் உறுப்பு எழுத்துக்களாக பிரியுங்கள்.',
        options: [], correct_answer: 'த்+அ,ம்+இ,ழ்',
        hint: 'த = த்+அ, மி = ம்+இ, ழ் is a pure consonant.',
        explanation: 'தமிழ் = த(த்+அ) + மி(ம்+இ) + ழ்'
    },

    // ═══════════════════════════════════════════════
    // GRAMMAR
    // ═══════════════════════════════════════════════

    // Beginner - Grammar
    {
        category: 'grammar', difficulty: 'Beginner', type: 'mcq', order: 1,
        question: 'What is the Tamil word for "I"?',
        question_tamil: '"I" என்பதன் தமிழ் சொல் என்ன?',
        options: ['நான்', 'நீ', 'அவன்', 'அவள்'], correct_answer: 'நான்',
        hint: 'It starts with "ந".',
        explanation: 'நான் (naan) = I, the first person singular pronoun in Tamil.'
    },
    {
        category: 'grammar', difficulty: 'Beginner', type: 'mcq', order: 2,
        question: 'What does "நீ" mean in English?',
        question_tamil: '"நீ" என்பதன் ஆங்கில பொருள் என்ன?',
        options: ['I', 'You', 'He', 'She'], correct_answer: 'You',
        hint: 'Second person pronoun.',
        explanation: 'நீ (nee) = You (informal, singular).'
    },
    {
        category: 'grammar', difficulty: 'Beginner', type: 'mcq', order: 3,
        question: 'What is "வணக்கம்" in English?',
        question_tamil: '"வணக்கம்" என்பதன் ஆங்கில பொருள் என்ன?',
        options: ['Thank you', 'Sorry', 'Hello', 'Goodbye'], correct_answer: 'Hello',
        hint: 'It is a common greeting.',
        explanation: 'வணக்கம் (vanakkam) = Hello / Greetings.'
    },
    {
        category: 'grammar', difficulty: 'Beginner', type: 'mcq', order: 4,
        question: 'Choose the correct Tamil translation of "Thank you".',
        question_tamil: '"Thank you" என்பதன் சரியான தமிழ் மொழிபெயர்ப்பை தேர்ந்தெடுங்கள்.',
        options: ['வணக்கம்', 'நன்றி', 'பொறுமை', 'வரவேற்பு'], correct_answer: 'நன்றி',
        hint: 'Starts with "ந".',
        explanation: 'நன்றி (nandri) = Thank you.'
    },

    // Intermediate - Grammar
    {
        category: 'grammar', difficulty: 'Intermediate', type: 'mcq', order: 1,
        question: 'What is the verb "to eat" in Tamil?',
        question_tamil: '"to eat" என்பதன் தமிழ் வினைச்சொல் என்ன?',
        options: ['சாப்பிடு', 'குடி', 'படி', 'ஓடு'], correct_answer: 'சாப்பிடு',
        hint: 'Related to food consumption.',
        explanation: 'சாப்பிடு (saappidu) = to eat.'
    },
    {
        category: 'grammar', difficulty: 'Intermediate', type: 'text', order: 2,
        question: 'Type the Tamil word for "Water".',
        question_tamil: '"Water" என்பதற்கான தமிழ் சொல்லை தட்டச்சு செய்யுங்கள்.',
        options: [], correct_answer: 'தண்ணீர்',
        hint: 'It starts with "த".',
        explanation: 'தண்ணீர் (thanneer) = Water.'
    },
    {
        category: 'grammar', difficulty: 'Intermediate', type: 'mcq', order: 3,
        question: 'In Tamil grammar, which suffix marks the past tense?',
        question_tamil: 'தமிழ் இலக்கணத்தில் இறந்தகால விகுதி எது?',
        options: ['-ஆன்', '-த்', '-ப்', '-கிற்'], correct_answer: '-த்',
        hint: 'Think "th" sound added to the verb root.',
        explanation: 'The past tense marker in Tamil is typically -த் (-th) or its variants.'
    },
    {
        category: 'grammar', difficulty: 'Intermediate', type: 'mcq', order: 4,
        question: 'What does "என் பெயர்" mean?',
        question_tamil: '"என் பெயர்" என்பதன் பொருள் என்ன?',
        options: ['My house', 'My name', 'My friend', 'My book'], correct_answer: 'My name',
        hint: 'A phrase used in introductions.',
        explanation: 'என் பெயர் (en peyar) = My name.'
    },

    // Advanced - Grammar
    {
        category: 'grammar', difficulty: 'Advanced', type: 'text', order: 1,
        question: 'Translate "I am reading a book" to Tamil.',
        question_tamil: '"I am reading a book" என்பதை தமிழில் மொழிபெயர்க்கவும்.',
        options: [], correct_answer: 'நான் ஒரு புத்தகம் படிக்கிறேன்',
        hint: 'நான் = I, புத்தகம் = book, படிக்கிறேன் = am reading.',
        explanation: 'நான் ஒரு புத்தகம் படிக்கிறேன் = I am reading a book.'
    },
    {
        category: 'grammar', difficulty: 'Advanced', type: 'text', order: 2,
        question: 'Translate "She goes to school" to Tamil.',
        question_tamil: '"She goes to school" என்பதை தமிழில் மொழிபெயர்க்கவும்.',
        options: [], correct_answer: 'அவள் பள்ளிக்கு செல்கிறாள்',
        hint: 'அவள் = She, பள்ளி = school.',
        explanation: 'அவள் பள்ளிக்கு செல்கிறாள் = She goes to school.'
    },

    // ═══════════════════════════════════════════════
    // SENTENCES
    // ═══════════════════════════════════════════════

    // Beginner - Sentences
    {
        category: 'sentences', difficulty: 'Beginner', type: 'mcq', order: 1,
        question: 'Choose the correct Tamil sentence for "This is a book".',
        question_tamil: '"This is a book" என்பதற்கான சரியான தமிழ் வாக்கியத்தை தேர்வு செய்யவும்.',
        options: ['இது ஒரு புத்தகம்', 'அது ஒரு பூ', 'இது ஒரு வீடு', 'இது ஒரு பள்ளி'], correct_answer: 'இது ஒரு புத்தகம்',
        hint: 'இது = This, புத்தகம் = book.',
        explanation: 'இது ஒரு புத்தகம் (ithu oru puththagam) = This is a book.'
    },
    {
        category: 'sentences', difficulty: 'Beginner', type: 'mcq', order: 2,
        question: 'What does "அது ஒரு பூ" mean?',
        question_tamil: '"அது ஒரு பூ" என்பதன் பொருள் என்ன?',
        options: ['This is a cat', 'That is a flower', 'This is a dog', 'That is a tree'], correct_answer: 'That is a flower',
        hint: 'பூ = flower.',
        explanation: 'அது ஒரு பூ (athu oru poo) = That is a flower.'
    },
    {
        category: 'sentences', difficulty: 'Beginner', type: 'mcq', order: 3,
        question: 'Choose the Tamil for "My name is...".',
        question_tamil: '"My name is..." என்பதற்கான தமிழ் என்ன?',
        options: ['என் வீடு...', 'என் பெயர்...', 'என் நண்பன்...', 'என் பள்ளி...'], correct_answer: 'என் பெயர்...',
        hint: 'பெயர் = name.',
        explanation: 'என் பெயர் (en peyar) = My name is...'
    },

    // Intermediate - Sentences
    {
        category: 'sentences', difficulty: 'Intermediate', type: 'text', order: 1,
        question: 'Translate "I drink water" to Tamil.',
        question_tamil: '"I drink water" என்பதை தமிழில் எழுதுங்கள்.',
        options: [], correct_answer: 'நான் தண்ணீர் குடிக்கிறேன்',
        hint: 'நான் = I, தண்ணீர் = water, குடிக்கிறேன் = drink.',
        explanation: 'நான் தண்ணீர் குடிக்கிறேன் (naan thanneer kudikkiren).'
    },
    {
        category: 'sentences', difficulty: 'Intermediate', type: 'text', order: 2,
        question: 'Translate "He is a good boy" to Tamil.',
        question_tamil: '"He is a good boy" என்பதை தமிழில் எழுதுங்கள்.',
        options: [], correct_answer: 'அவன் ஒரு நல்ல பையன்',
        hint: 'அவன் = He, நல்ல = good, பையன் = boy.',
        explanation: 'அவன் ஒரு நல்ல பையன் = He is a good boy.'
    },

    // Advanced - Sentences  
    {
        category: 'sentences', difficulty: 'Advanced', type: 'text', order: 1,
        question: 'Form a Tamil sentence using: நான், நேற்று, சினிமா, பார்த்தேன் (I watched a movie yesterday).',
        question_tamil: 'கொடுக்கப்பட்ட சொற்களைப் பயன்படுத்தி வாக்கியம் அமையுங்கள்.',
        options: [], correct_answer: 'நான் நேற்று சினிமா பார்த்தேன்',
        hint: 'Subject + Time + Object + Verb (SOV order).',
        explanation: 'Tamil follows SOV order: நான் நேற்று சினிமா பார்த்தேன்.'
    },
    {
        category: 'sentences', difficulty: 'Advanced', type: 'text', order: 2,
        question: 'Translate "We will go to the temple tomorrow" to Tamil.',
        question_tamil: '"We will go to the temple tomorrow" என்பதை தமிழில் மொழிபெயர்க்கவும்.',
        options: [], correct_answer: 'நாங்கள் நாளை கோவிலுக்கு செல்வோம்',
        hint: 'நாங்கள் = We, நாளை = tomorrow, கோவில் = temple.',
        explanation: 'நாங்கள் நாளை கோவிலுக்கு செல்வோம் = We will go to the temple tomorrow.'
    },
    {
        category: 'sentences', difficulty: 'Advanced', type: 'text', order: 3,
        question: 'Translate "The children are playing in the park" to Tamil.',
        question_tamil: '"The children are playing in the park" என்பதை தமிழில் மொழிபெயர்க்கவும்.',
        options: [], correct_answer: 'குழந்தைகள் பூங்காவில் விளையாடுகிறார்கள்',
        hint: 'குழந்தைகள் = children, பூங்கா = park, விளையாடு = play.',
        explanation: 'குழந்தைகள் பூங்காவில் விளையாடுகிறார்கள் = The children are playing in the park.'
    },

    // ═══════════════════════════════════════════════
    // PRONUNCIATION — Basic pronunciation guidance
    // ═══════════════════════════════════════════════

    // Beginner - Pronunciation
    {
        category: 'uyir', difficulty: 'Beginner', type: 'mcq', order: 6,
        question: 'How is the Tamil vowel "அ" pronounced?',
        question_tamil: '"அ" எவ்வாறு உச்சரிக்கப்படுகிறது?',
        options: ['Like "a" in "about"', 'Like "aa" in "father"', 'Like "i" in "it"', 'Like "u" in "put"'],
        correct_answer: 'Like "a" in "about"',
        hint: 'It is a short vowel, similar to the schwa sound.',
        explanation: 'அ is pronounced as a short "a" like in "about" or "apart". It is the most basic Tamil vowel sound.'
    },
    {
        category: 'uyir', difficulty: 'Beginner', type: 'mcq', order: 7,
        question: 'Which vowel pair differs ONLY in length of pronunciation?',
        question_tamil: 'எந்த உயிர் எழுத்து ஜோடி உச்சரிப்பு நீளத்தில் மட்டுமே வேறுபடுகிறது?',
        options: ['அ and ஆ', 'அ and இ', 'உ and எ', 'ஐ and ஔ'],
        correct_answer: 'அ and ஆ',
        hint: 'One is short, the other is its long pair.',
        explanation: 'அ (short "a") and ஆ (long "aa") form a kuril-nedil pair. ஆ is held approximately twice as long as அ when spoken.'
    },
    {
        category: 'mei', difficulty: 'Beginner', type: 'mcq', order: 5,
        question: 'The Tamil consonant "ழ" produces a unique sound not found in most other languages. What is it closest to?',
        question_tamil: '"ழ" என்ற தமிழ் மெய் எழுத்தின் ஒலி எதற்கு நெருக்கமானது?',
        options: ['A retroflex "l" (tongue curled back)', 'A regular "z" sound', 'A "sh" sound', 'A "th" sound'],
        correct_answer: 'A retroflex "l" (tongue curled back)',
        hint: 'It requires curling the tongue back toward the palate.',
        explanation: 'ழ (zha) is a unique Tamil retroflex approximant. The tongue curls back and the tip touches the roof of the mouth. It is found in words like தமிழ் (Tamil).'
    },

    // Intermediate - Pronunciation
    {
        category: 'uyir', difficulty: 'Intermediate', type: 'mcq', order: 4,
        question: 'Tamil vowels are classified into kuril (short) and nedil (long). How does pronunciation differ?',
        question_tamil: 'குறில் மற்றும் நெடில் உயிர் எழுத்துக்களின் உச்சரிப்பு எவ்வாறு வேறுபடுகிறது?',
        options: [
            'Nedil is held twice as long as kuril',
            'Kuril is louder than nedil',
            'They have completely different sounds',
            'Nedil has a nasal quality'
        ],
        correct_answer: 'Nedil is held twice as long as kuril',
        hint: 'Time duration is the key difference.',
        explanation: 'Nedil (நெடில்) vowels are held approximately twice as long as kuril (குறில்) vowels. E.g., அ (1 count) vs ஆ (2 counts). This duration difference is essential for correct Tamil pronunciation.'
    },
    {
        category: 'mei', difficulty: 'Intermediate', type: 'mcq', order: 4,
        question: 'In Tamil pronunciation, what distinguishes vallinam (hard), mellinam (soft), and idaiyinam (medium) consonants?',
        question_tamil: 'வல்லினம், மெல்லினம், இடையினம் மெய் எழுத்துக்களை எது வேறுபடுத்துகிறது?',
        options: [
            'Manner of articulation (stop, nasal, approximant)',
            'The vowel they combine with',
            'Their position in the alphabet',
            'Writing stroke count'
        ],
        correct_answer: 'Manner of articulation (stop, nasal, approximant)',
        hint: 'Think about HOW the sound is produced in the mouth.',
        explanation: 'Vallinam (வல்லினம்) are voiceless stops (க், ச், ட், த், ப், ற்). Mellinam (மெல்லினம்) are nasals (ங், ஞ், ண், ந், ம், ன்). Idaiyinam (இடையினம்) are approximants/laterals (ய், ர், ல், வ், ழ், ள்).'
    },
    {
        category: 'grammar', difficulty: 'Intermediate', type: 'mcq', order: 5,
        question: 'How is the word "வணக்கம்" (vanakkam) broken into syllables for pronunciation?',
        question_tamil: '"வணக்கம்" என்ற சொல் எவ்வாறு அசைகளாகப் பிரிக்கப்படுகிறது?',
        options: ['va-nak-kam', 'van-ak-kam', 'va-na-kkam', 'vana-kkam'],
        correct_answer: 'va-nak-kam',
        hint: 'Break at natural consonant-vowel boundaries.',
        explanation: 'வணக்கம் is pronounced va-nak-kam: வ(va) + ண(nak) + க்கம்(kam). The doubled க்க indicates a geminate consonant, pronounced with a brief pause.'
    },

    // Advanced - Pronunciation
    {
        category: 'grammar', difficulty: 'Advanced', type: 'text', order: 3,
        question: 'Write the pronunciation guide (in English transliteration) for: "பள்ளிக்கூடம்" (school).',
        question_tamil: '"பள்ளிக்கூடம்" என்ற சொல்லின் ஆங்கில ஒலிபெயர்ப்பை எழுதுங்கள்.',
        options: [], correct_answer: 'pallikkoodam',
        hint: 'ப=pa, ள்=ll, இ=i, க்=k, கூ=koo, ட=da, ம்=m',
        explanation: 'பள்ளிக்கூடம் = pallikkoodam. Note: ள் is a retroflex "l", the doubled ள்ளி shows gemination, and கூ is the long "oo" vowel combined with "k".'
    },
    {
        category: 'grammar', difficulty: 'Advanced', type: 'text', order: 4,
        question: 'Write the Tamil word for "language" and its transliteration. Format: Tamil-transliteration',
        question_tamil: '"language" என்பதற்கான தமிழ் சொல் மற்றும் ஒலிபெயர்ப்பை எழுதுங்கள்.',
        options: [], correct_answer: 'மொழி-mozhi',
        hint: 'It contains the special Tamil letter ழ (zha).',
        explanation: 'மொழி (mozhi) = language. The ழ is the unique Tamil retroflex sound, transliterated as "zh". மொ = mo, ழி = zhi.'
    },

    // Additional Uyir-Mei pronunciation
    {
        category: 'uyir-mei', difficulty: 'Intermediate', type: 'mcq', order: 3,
        question: 'When க் combines with உ to form கு, how is it pronounced?',
        question_tamil: 'க் + உ = கு எவ்வாறு உச்சரிக்கப்படுகிறது?',
        options: ['ku (like "ku" in "kudo")', 'gu (like "gu" in "guru")', 'koo (long oo sound)', 'ka (short a sound)'],
        correct_answer: 'ku (like "ku" in "kudo")',
        hint: 'The consonant க் takes the short "u" vowel sound.',
        explanation: 'கு is pronounced "ku" — the consonant க் (k) combines with the short vowel உ (u). Compare with கூ (koo) which uses the long vowel ஊ.'
    },

    // Additional sentence pronunciation
    {
        category: 'sentences', difficulty: 'Intermediate', type: 'mcq', order: 3,
        question: 'In the greeting "வணக்கம்" (vanakkam), which syllable receives the primary stress?',
        question_tamil: '"வணக்கம்" என்ற சொல்லில் முதன்மை அழுத்தம் எந்த அசையில் விழுகிறது?',
        options: ['First syllable (va)', 'Second syllable (nak)', 'Third syllable (kam)', 'All syllables equal'],
        correct_answer: 'First syllable (va)',
        hint: 'Tamil typically stresses the first syllable of a word.',
        explanation: 'Tamil generally places primary stress on the first syllable of a word. "வணக்கம்" is stressed as VA-nak-kam. This pattern is consistent across most Tamil words.'
    },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing lessons
        await Lesson.deleteMany({});
        console.log('Cleared existing lessons');

        // Insert all lessons
        await Lesson.insertMany(lessons);
        console.log(`✅ Seeded ${lessons.length} Tamil lessons successfully!`);

        // Print summary
        const summary = {};
        lessons.forEach(l => {
            const key = `${l.category} (${l.difficulty})`;
            summary[key] = (summary[key] || 0) + 1;
        });
        console.table(summary);

        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err.message);
        process.exit(1);
    }
}

seed();

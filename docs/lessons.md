> LEGACY SPEC NOTE: This file is an archived curriculum-generation prompt and contains historical target counts.
> Do not use this file as launch-readiness source of truth.
> Use [DEPLOYMENT_READY_IMPLEMENTATION_PLAN.md](DEPLOYMENT_READY_IMPLEMENTATION_PLAN.md) for active execution governance.

You are building the complete Tamil learning curriculum for the "தமிழ் கற்போம்" 
adaptive learning platform. Your goal is to create a full, fluency-focused lesson 
system — from absolute zero Tamil knowledge to conversational fluency — using the 
existing tech stack: React 18 + Vite + Tailwind CSS (frontend), Node.js + Express + 
Mongoose (backend), MongoDB (database), with JWT auth already in place.

═══════════════════════════════════════════════
MISSION
═══════════════════════════════════════════════
Replace/extend the current 53-question seed with a COMPLETE fluency curriculum of 
300+ lessons across 10 progressive stages. Every lesson must be playable, scoreable, 
and feed into the existing skill score formula:
  raw = (0.45 × success_rate) + (0.20 × time_efficiency) + (0.15 × error_control) + (0.10 × hint_independence) + (0.06 × retry_control) + (0.04 × focus_score)
  final_skill = w × raw + (1 − w) × current_skill, where w = 0.35 + 0.30 × min(1, N/20)

The existing adaptive UI already handles Beginner / Intermediate / Advanced rendering.
Your job is purely the CONTENT ENGINE + EXERCISE TYPES.

═══════════════════════════════════════════════
STAGE STRUCTURE (10 stages, sequential unlock)
═══════════════════════════════════════════════

STAGE 1 — Uyir Eluthukal (உயிர் எழுத்துகள்) — 12 Pure Vowels
  Goal: Recognise, pronounce, and write all 12 Tamil vowels
  Lessons per vowel: 3 (recognition → matching → writing)
  Exercise types: 
    - Image-to-letter matching (show mouth shape / phonetic diagram)
    - Audio tap: hear sound → pick correct letter from 4 options
    - Trace & type: transliteration prompt → type Tamil unicode character
    - Vowel family grouping (short vs long pairs: அ/ஆ, இ/ஈ, உ/ஊ ...)
  Total: 36 lessons

STAGE 2 — Mei Eluthukal (மெய் எழுத்துகள்) — 18 Pure Consonants
  Goal: Recognise all 18 consonants with inherent schwa sound
  Lessons per consonant: 2 (recognition → recall)
  Exercise types:
    - Flash card flip (Tamil → transliteration)
    - 4-choice audio MCQ
    - Fill-in-the-blank: _  = "ka" → க
    - Consonant classification (vallinam / mellinam / idaiyinam groups)
  Total: 36 lessons

STAGE 3 — Uyir-Mei (உயிர்மெய்) — The 216 Combination Grid
  Goal: Master the vowel-consonant combination matrix
  Approach: Teach in BLOCKS of one consonant × all 12 vowels
  Exercise types:
    - Grid tap: given consonant + vowel audio → tap correct combined letter
    - Reverse decode: show uyirmei → pick vowel used + consonant used
    - Pattern recognition: spot the odd one out in a consonant family
    - Speed round: 10 combos in 60s (unlocks at Advanced)
  Total: 54 lessons (3 per consonant block × 18 blocks)

STAGE 4 — Numbers, Days & Time (எண்கள், நாட்கள், நேரம்)
  Goal: Count 1–100, days of week, months, tell time
  Exercise types:
    - Number dictation: hear spoken number → type Tamil numeral
    - Clock face: shown time → type "மணி X ஆகிறது"
    - Sequence fill: ___, மூன்று, நான்கு, ___ 
    - Day ordering drag-and-drop
  Total: 24 lessons

STAGE 5 — Core Vocabulary — 500 Essential Words
  Organised into 10 semantic sets (20 words each × 2 lessons each):
    Set 1: Body parts (உடல் உறுப்புகள்)
    Set 2: Family (குடும்பம்)
    Set 3: Food & Drink (உணவு)
    Set 4: Colours & Shapes (நிறங்கள்)
    Set 5: Animals (விலங்குகள்)
    Set 6: Home & Objects (வீடு)
    Set 7: Nature & Weather (இயற்கை)
    Set 8: Transport (போக்குவரத்து)
    Set 9: Emotions (உணர்வுகள்)
    Set 10: Common Verbs (வினைச்சொற்கள்)
  Exercise types:
    - Picture → Tamil word MCQ
    - Tamil word → English meaning
    - Word-to-image drag match
    - Spell it: hear audio → type the word
    - Contextual sentence: word shown in sentence, pick meaning
  Total: 20 lessons per set × 10 sets = 200 vocab drills (grouped into 40 lesson units)

STAGE 6 — Basic Sentence Structure (எளிய வாக்கியம்)
  Goal: SOV sentence pattern, gender/number agreement, basic tenses
  Topics:
    - Subject pronouns (நான், நீ, அவன், அவள், அவர், நாங்கள், நீங்கள், அவர்கள்)
    - Simple present: நான் சாப்பிடுகிறேன்
    - Simple past: நான் சாப்பிட்டேன்
    - Simple future: நான் சாப்பிடுவேன்
    - Negative forms: நான் சாப்பிடவில்லை
    - Question formation: என்ன, எங்கே, எப்போது, யார், எவ்வளவு
  Exercise types:
    - Sentence builder: drag words into correct SOV order
    - Tense transformer: given present form → convert to past/future
    - Error spotter: find the grammatically wrong word in a sentence
    - Translation MCQ: English sentence → pick correct Tamil translation
    - Fill-in-blank: verb conjugation (give root → pick correct form)
  Total: 30 lessons

STAGE 7 — Conversations & Dialogues (உரையாடல்)
  Goal: Real-world functional communication
  Scenarios (6 dialogues × 4 lessons each):
    Dialogue 1: Greetings & Introductions
      வணக்கம், என் பெயர் ___, நீங்கள் எப்படி இருக்கீங்க?
    Dialogue 2: At a Restaurant / Ordering Food
      என்ன இருக்கு? எனக்கு ___ வேணும். எவ்வளவு ஆகும்?
    Dialogue 3: Asking Directions
      ___ எங்கே இருக்கு? நேரே போங்க, திரும்புங்க.
    Dialogue 4: Shopping & Bargaining
      இது எவ்வளவு? கொஞ்சம் குறைக்க முடியுமா?
    Dialogue 5: Doctor / Health
      என்ன ஆச்சு? எங்கே வலிக்குது?
    Dialogue 6: Phone / Travel
      நான் ___ கிட்ட பேசணும். பஸ் எத்தனை மணிக்கு?
  Exercise types:
    - Role-play MCQ: given context line → pick best response
    - Dialogue sequencing: put 6 scrambled lines in correct order
    - Blank-fill in dialogue script
    - Listen + respond: audio prompt → type reply
    - Cultural note flash card (when to use formal நீங்கள் vs informal நீ)
  Total: 24 lessons

STAGE 8 — Reading Comprehension (படிக்கும் திறன்)
  Goal: Read connected Tamil prose with understanding
  Texts (graded):
    - Level 1 (Beginner): 2–3 sentence descriptions (animals, family)
    - Level 2 (Intermediate): 5–7 sentence passages (daily routine, news item)
    - Level 3 (Advanced): 10–12 sentence stories (folk tale excerpts, dialogues)
  Exercise types:
    - True / False comprehension questions (Tamil)
    - Vocabulary in context: underlined word → pick meaning
    - Summary MCQ: which sentence best summarises the passage?
    - Sequence the events: drag 4 events into story order
    - Inference question: what does the character feel?
  Total: 5 texts per level × 3 levels × 2 exercises = 30 lessons

STAGE 9 — Writing Practice (எழுதும் திறன்)
  Goal: Compose simple to complex Tamil sentences independently
  Exercise types:
    - Prompted sentence write: given English prompt → type Tamil sentence
      (auto-graded via exact match + normalised unicode comparison)
    - Paragraph arrange: given 5 sentences → drag into logical order
    - Error correction: given wrong sentence → rewrite correctly
    - Translation challenge: English paragraph (3 sentences) → Tamil
    - Free write: open prompt with model answer reveal (peer-style rubric shown)
  Topics: self-introduction, describing family, favourite food, my day, my city
  Total: 20 lessons

STAGE 10 — Fluency Mastery Tests (தேர்ச்சி தேர்வுகள்)
  One cumulative test per Stage 1–9 (9 tests) + 1 full fluency test
  Each test: 20 questions, timed (Advanced mode forced), no hints
  Pass threshold: 70% to unlock certificate badge
  Exercise types: mixed from all prior exercise types
  Total: 10 lessons (tests)

═══════════════════════════════════════════════
TOTAL CURRICULUM
═══════════════════════════════════════════════
Stage 1:  36  | Stage 2:  36  | Stage 3:  54
Stage 4:  24  | Stage 5:  40  | Stage 6:  30
Stage 7:  24  | Stage 8:  30  | Stage 9:  20
Stage 10: 10
──────────────────────────────────────────────
TOTAL:   304 lessons

═══════════════════════════════════════════════
DATA MODEL — Extend existing Mongoose Lesson schema
═══════════════════════════════════════════════
Add these fields to the existing Lesson model:

{
  // EXISTING
  category: String,         // map to stage name
  difficulty: String,       // 'beginner'|'intermediate'|'advanced'
  question: String,
  questionType: String,
  options: [String],
  correctAnswer: String,
  explanation: String,
  hint: String,
  transliteration: String,

  // NEW FIELDS TO ADD
  stage: Number,            // 1–10 (unlock gate)
  stageOrder: Number,       // position within stage
  exerciseType: String,     // enum below
  audioKey: String,         // reference to Web Audio API tone or TTS string
  imageAlt: String,         // accessibility label for image exercises
  dragItems: [String],      // for drag-and-drop exercises
  dragTargets: [String],    // correct drop zones (parallel array)
  sentenceParts: [String],  // for sentence builder exercises
  correctOrder: [Number],   // correct index order for sequence exercises
  passage: String,          // for reading comprehension (Stage 8)
  passageTitle: String,
  writingPrompt: String,    // for Stage 9 writing exercises
  modelAnswer: String,      // normalised correct Tamil unicode string
  isMasteryTest: Boolean,   // Stage 10 flag
  unlocksStage: Number,     // which stage completing this unlocks
  culturalNote: String,     // optional bilingual cultural context
  tamilScript: String,      // primary Tamil unicode display string
  phonetic: String,         // IPA or simplified phonetic
}

exerciseType enum values:
  'audio_mcq' | 'image_mcq' | 'text_mcq' | 'trace_type' | 'flashcard' |
  'fill_blank' | 'drag_match' | 'sentence_builder' | 'tense_transform' |
  'error_spot' | 'dialogue_sequence' | 'role_play_mcq' | 'comprehension_mcq' |
  'true_false' | 'translation_input' | 'free_write' | 'speed_round' |
  'sequence_order' | 'mastery_test'

═══════════════════════════════════════════════
FRONTEND — New Exercise Components to Build
═══════════════════════════════════════════════
Create these React components in frontend/src/components/exercises/:

1. AudioMCQ.jsx
   - Play button triggers Web Speech API (speechSynthesis, lang='ta-IN')
   - 4 answer buttons, highlight correct on submit
   - Props: audioText, options[], correctAnswer, onSubmit

2. DragMatch.jsx
   - Two columns: Tamil words (draggable) ↔ English meanings (drop zones)
   - Visual connector lines on correct match
   - Props: dragItems[], dragTargets[], onSubmit

3. SentenceBuilder.jsx
   - Scrambled word chips → click to place in order slots
   - Red shake animation on wrong order submit
   - Props: sentenceParts[], correctOrder[], translation, onSubmit

4. FillBlank.jsx
   - Sentence with [___] gap rendered in Tamil font
   - Text input or MCQ variant controlled by prop
   - Props: sentence, blankIndex, options[]|null, correctAnswer, onSubmit

5. ReadingPassage.jsx
   - Renders Tamil passage with paragraph breaks
   - Inline word tap → shows transliteration tooltip
   - Question rendered below passage
   - Props: passage, passageTitle, question, exerciseType, options[], onSubmit

6. WritingInput.jsx
   - Large Tamil-capable textarea (font-family: 'Noto Sans Tamil')
   - Unicode normalisation before comparison (NFC)
   - Reveal model answer button after submission
   - Props: writingPrompt, modelAnswer, onSubmit

7. SpeedRound.jsx (Advanced only)
   - 60s countdown timer
   - Rapid-fire 10 questions, auto-advance on answer
   - Final score overlay
   - Props: questions[], onComplete

8. FlashCard.jsx
   - Flip animation (CSS 3D transform)
   - Front: Tamil script + audio button
   - Back: transliteration + meaning + example sentence
   - Props: tamilScript, transliteration, meaning, example, audioText

9. MasteryTest.jsx
   - Wraps existing question types, forces Advanced mode
   - Progress bar (Q n of 20)
   - Score gate: show pass/fail + unlock next stage badge on complete
   - Props: questions[], stageNumber, onComplete

═══════════════════════════════════════════════
BACKEND — New API Endpoints to Add
═══════════════════════════════════════════════
Add to existing routes (all require JWT auth):

GET  /api/lessons/stage/:stageNumber
     → returns all lessons for a stage, ordered by stageOrder
     → checks if previous stage mastery test is passed before returning

GET  /api/lessons/stages/progress
     → returns { stage, totalLessons, completedLessons, unlocked, masteryPassed }[]
     → used by Dashboard stage progress UI

POST /api/attempts/mastery
     → same as /api/attempts but sets isMasteryTest=true on attempt record
     → unlocks next stage in User document on pass (score >= 70)
     → returns { passed, score, unlockedStage }

GET  /api/lessons/stage/:stageNumber/next
     → returns the next unfinished lesson for the user in that stage
     → used for "Continue" button on Dashboard

═══════════════════════════════════════════════
SEED FILE — backend/seed.js
═══════════════════════════════════════════════
Rewrite seed.js to generate the full 304-lesson dataset.

For every lesson include ALL schema fields.
Every Tamil string must be valid Unicode (NFC normalised).
Include transliteration (ISO 15919 or simplified) for every Tamil string.
Include a hint in both English and Tamil for every lesson.
Include explanation (bilingual) for every lesson.
Mark the first lesson of each stage as difficulty='beginner'.

Structure the seed array as:
  const lessons = [
    ...stage1Lessons,   // 36 items
    ...stage2Lessons,   // 36 items
    ...stage3Lessons,   // 54 items
    ...stage4Lessons,   // 24 items
    ...stage5Lessons,   // 40 items
    ...stage6Lessons,   // 30 items
    ...stage7Lessons,   // 24 items
    ...stage8Lessons,   // 30 items
    ...stage9Lessons,   // 20 items
    ...stage10Lessons,  // 10 items
  ];

═══════════════════════════════════════════════
DASHBOARD — Stage Progress UI (new section)
═══════════════════════════════════════════════
Add a "Learning Path" section to the existing Dashboard page:

- Horizontal stage roadmap (Stage 1 → 10) with lock/unlock icons
- Each stage node shows: name (Tamil + English), % complete, mastery badge
- Click unlocked stage → goes to /learn?stage=N
- Locked stages show what score is needed to unlock
- Current active stage pulses with a glow animation

═══════════════════════════════════════════════
PRONUNCIATION ENGINE
═══════════════════════════════════════════════
Extend the existing web audio system:

- Use window.speechSynthesis with voice = 'ta-IN' for all Tamil audio
- Fallback: if ta-IN not available, use transliteration TTS with en-US voice
- Add a global useTamilSpeech() hook:
    speak(tamilText: string, rate?: number, pitch?: number): void
- Cache last 20 spoken strings to avoid re-init lag
- Add speaker icon button to every exercise card header

═══════════════════════════════════════════════
GAMIFICATION EXTENSIONS
═══════════════════════════════════════════════
Extend existing streak system:

- Stage completion badge (SVG trophy icon, stored in User.badges[])
- Fluency certificate: generated client-side as Canvas PNG on Stage 10 pass
  (user's name + "Tamil Fluency Certificate" + date + seal)
- Streak milestone badges: 7 days, 30 days, 100 days
- XP system: +10 per lesson, +50 per stage complete, +200 mastery test pass
  displayed as animated +XP popup on submit

═══════════════════════════════════════════════
EXECUTION ORDER
═══════════════════════════════════════════════
Build in this exact order:

1. Extend Mongoose Lesson schema with new fields
2. Extend User schema (unlockedStages[], badges[], xp, totalXP)
3. Write the full seed.js with all 304 lessons
4. Add new backend API endpoints (stage progress, mastery, next lesson)
5. Build the 9 exercise React components
6. Integrate components into existing AdaptiveLesson.jsx (switch on exerciseType)
7. Build Dashboard "Learning Path" stage roadmap section
8. Implement useTamilSpeech() hook and wire to all audio exercises
9. Add XP popup animation and badge award logic
10. Run: npm run seed && npm test

═══════════════════════════════════════════════
QUALITY CONSTRAINTS
═══════════════════════════════════════════════
- ALL Tamil text must be Unicode NFC normalised
- Every lesson must have: question, correctAnswer, hint (bilingual), explanation (bilingual), transliteration, tamilScript, phonetic
- No lesson may have fewer than 3 distractor options for MCQ types
- Distractors must be plausible (same consonant family, similar shape, or close meaning) — not random
- Stage 1–3 lessons MUST include IPA phonetic notation
- Reading passages (Stage 8) must be original, simple prose — no copy from external sources
- Writing model answers must include 2 acceptable variants (strict + colloquigal)
- All drag-and-drop and sentence builder exercises must be keyboard accessible (tab + enter)
- Every new component must have a corresponding Vitest unit test file

Start with Step 1. Show me the extended schema first, then proceed stage by stage.
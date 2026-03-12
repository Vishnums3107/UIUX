/**
 * Skill Estimation Engine
 * 
 * Calculates proficiency score using the formula:
 * skill_score = (0.4 × success_rate) + (0.2 × time_efficiency) − (0.2 × error_rate) − (0.2 × hint_dependency)
 * 
 * All sub-scores are normalized 0–100 before combining.
 * Final score is clamped to 0–100.
 */

const EXPECTED_TIME_PER_QUESTION = 30; // seconds
const MAX_ERRORS_PER_QUESTION = 5;
const MAX_HINTS_PER_QUESTION = 3;

/**
 * Calculate a new skill score from recent attempts.
 * Uses a rolling window of the last N attempts combined with the existing skill score
 * for smooth transitions. Supports reversible adaptation.
 * 
 * @param {Array} attempts - Array of recent LessonAttempt documents
 * @param {number} currentSkillScore - The user's current skill score
 * @returns {{ skillScore: number, level: string }}
 */
function calculateSkillScore(attempts, currentSkillScore = 50) {
    if (!attempts || attempts.length === 0) {
        return { skillScore: currentSkillScore, level: getLevel(currentSkillScore) };
    }

    // --- 1. Success Rate (0–100) ---
    const totalCorrect = attempts.filter(a => a.score === 1).length;
    const successRate = (totalCorrect / attempts.length) * 100;

    // --- 2. Time Efficiency (0–100) ---
    // If avg time <= expected, efficiency = 100. Degrades linearly up to 3× expected.
    const avgTime = attempts.reduce((sum, a) => sum + a.time_spent, 0) / attempts.length;
    const timeRatio = avgTime / EXPECTED_TIME_PER_QUESTION;
    const timeEfficiency = Math.max(0, Math.min(100, (1 - (timeRatio - 1) / 2) * 100));

    // --- 3. Error Rate (0–100, higher = more errors = worse) ---
    const avgErrors = attempts.reduce((sum, a) => sum + a.errors, 0) / attempts.length;
    const errorRate = Math.min(100, (avgErrors / MAX_ERRORS_PER_QUESTION) * 100);

    // --- 4. Hint Dependency (0–100, higher = more hints = worse) ---
    const avgHints = attempts.reduce((sum, a) => sum + a.hints_used, 0) / attempts.length;
    const hintDependency = Math.min(100, (avgHints / MAX_HINTS_PER_QUESTION) * 100);

    // --- Combine with weights ---
    const rawScore =
        (0.4 * successRate) +
        (0.2 * timeEfficiency) -
        (0.2 * errorRate) -
        (0.2 * hintDependency);

    // Normalize to 0–100
    const newScore = Math.max(0, Math.min(100, rawScore));

    // Smooth transition: blend 60% new calculation, 40% existing score
    // This prevents jarring jumps and enables gradual reversible adaptation
    const blendedScore = Math.round(0.6 * newScore + 0.4 * currentSkillScore);
    const finalScore = Math.max(0, Math.min(100, blendedScore));

    return {
        skillScore: finalScore,
        level: getLevel(finalScore),
        details: {
            successRate: Math.round(successRate),
            timeEfficiency: Math.round(timeEfficiency),
            errorRate: Math.round(errorRate),
            hintDependency: Math.round(hintDependency),
            rawScore: Math.round(rawScore)
        }
    };
}

/**
 * Map score to level
 */
function getLevel(score) {
    if (score <= 30) return 'Beginner';
    if (score <= 70) return 'Intermediate';
    return 'Advanced';
}

module.exports = { calculateSkillScore, getLevel };

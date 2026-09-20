/**
 * Skill Estimation Engine
 * 
 * Calculates proficiency score using a weighted multi-signal model.
 *
 * Raw score (0-100):
 * raw_score =
 *   (0.45 × success_rate) +
 *   (0.20 × time_efficiency) +
 *   (0.15 × error_control) +
 *   (0.10 × hint_independence) +
 *   (0.06 × retry_control) +
 *   (0.04 × focus_score)
 *
 * Where:
 * - error_control = 100 - error_rate
 * - hint_independence = 100 - hint_dependency
 * - retry_control = 100 - retry_dependency
 * - focus_score = 100 - idle_penalty
 *
 * Attempts are recency-weighted so recent attempts influence the score more.
 * Final score uses confidence-aware smoothing to reduce overreaction on low sample sizes.
 * 
 * All sub-scores are normalized 0-100.
 * Final score is clamped to 0-100.
 */

const EXPECTED_TIME_PER_QUESTION = 30; // seconds
const MAX_ERRORS_PER_QUESTION = 5;
const MAX_HINTS_PER_QUESTION = 3;
const MAX_RETRIES_PER_QUESTION = 4;

const ROLLING_WINDOW_TARGET = 20;
const RECENCY_DECAY = 0.9;
const MIN_NEW_SCORE_WEIGHT = 0.35;
const MAX_NEW_SCORE_WEIGHT = 0.65;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toNonNegativeNumber(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return parsed < 0 ? 0 : parsed;
}

function buildNormalizedRecencyWeights(attempts) {
    const weights = attempts.map((_, index) => Math.pow(RECENCY_DECAY, index));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
    return weights.map(value => value / totalWeight);
}

function weightedAverage(attempts, weights, getter) {
    return attempts.reduce((sum, attempt, index) => sum + (getter(attempt) * weights[index]), 0);
}

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
    const baselineScore = clamp(toNonNegativeNumber(currentSkillScore), 0, 100);

    if (!attempts || attempts.length === 0) {
        return { skillScore: baselineScore, level: getLevel(baselineScore) };
    }

    const weights = buildNormalizedRecencyWeights(attempts);

    // --- 1. Success Rate (0-100), recency-weighted ---
    const successRate = weightedAverage(attempts, weights, (attempt) => {
        const score = clamp(Number(attempt?.score) || 0, 0, 1);
        return score * 100;
    });

    // --- 2. Time Efficiency (0-100), based on active time only ---
    // If avg time <= expected, efficiency = 100. Degrades linearly up to 3× expected.
    const avgActiveTime = weightedAverage(attempts, weights, (attempt) => {
        const timeSpent = toNonNegativeNumber(attempt?.time_spent);
        const idleTime = toNonNegativeNumber(attempt?.idle_time);
        return Math.max(0, timeSpent - idleTime);
    });
    const timeRatio = avgActiveTime / EXPECTED_TIME_PER_QUESTION;
    const timeEfficiency = clamp((1 - ((timeRatio - 1) / 2)) * 100, 0, 100);

    // --- 3. Error/Hint/Retry penalties (0-100, higher = worse), recency-weighted ---
    const avgErrors = weightedAverage(attempts, weights, attempt => toNonNegativeNumber(attempt?.errors));
    const avgHints = weightedAverage(attempts, weights, attempt => toNonNegativeNumber(attempt?.hints_used));
    const avgRetries = weightedAverage(attempts, weights, attempt => toNonNegativeNumber(attempt?.retries));

    const errorRate = clamp((avgErrors / MAX_ERRORS_PER_QUESTION) * 100, 0, 100);
    const hintDependency = clamp((avgHints / MAX_HINTS_PER_QUESTION) * 100, 0, 100);
    const retryDependency = clamp((avgRetries / MAX_RETRIES_PER_QUESTION) * 100, 0, 100);

    // Idle penalty uses the fraction of idle time per attempt.
    const idlePenalty = weightedAverage(attempts, weights, (attempt) => {
        const timeSpent = toNonNegativeNumber(attempt?.time_spent);
        const idleTime = toNonNegativeNumber(attempt?.idle_time);
        if (timeSpent === 0) return idleTime > 0 ? 100 : 0;
        return clamp((idleTime / timeSpent) * 100, 0, 100);
    });

    const errorControl = 100 - errorRate;
    const hintIndependence = 100 - hintDependency;
    const retryControl = 100 - retryDependency;
    const focusScore = 100 - idlePenalty;

    // --- Combine into a normalized 0-100 raw score ---
    const rawScore =
        (0.45 * successRate) +
        (0.2 * timeEfficiency) +
        (0.15 * errorControl) +
        (0.1 * hintIndependence) +
        (0.06 * retryControl) +
        (0.04 * focusScore);

    const normalizedRawScore = clamp(rawScore, 0, 100);

    const confidence = clamp(attempts.length / ROLLING_WINDOW_TARGET, 0, 1);
    const newScoreWeight = MIN_NEW_SCORE_WEIGHT + ((MAX_NEW_SCORE_WEIGHT - MIN_NEW_SCORE_WEIGHT) * confidence);

    // Smooth transition: confidence controls how much new evidence should move the score.
    const blendedScore = Math.round((newScoreWeight * normalizedRawScore) + ((1 - newScoreWeight) * baselineScore));
    const finalScore = clamp(blendedScore, 0, 100);

    return {
        skillScore: finalScore,
        level: getLevel(finalScore),
        details: {
            successRate: Math.round(successRate),
            timeEfficiency: Math.round(timeEfficiency),
            errorRate: Math.round(errorRate),
            hintDependency: Math.round(hintDependency),
            rawScore: Math.round(normalizedRawScore),
            retryDependency: Math.round(retryDependency),
            idlePenalty: Math.round(idlePenalty),
            confidence: Math.round(confidence * 100),
            smoothingWeight: Number(newScoreWeight.toFixed(2))
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

/**
 * Time and duration utilities
 */

/**
 * Calculate elapsed seconds from a start time
 */
function getElapsedSeconds(startTime) {
    const elapsed = Date.now() - new Date(startTime).getTime();
    return Math.floor(elapsed / 1000);
}

/**
 * Format seconds into HH:MM:SS format
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculate time remaining for an exam
 */
function getTimeRemaining(startTime, durationMinutes) {
    const elapsed = getElapsedSeconds(startTime);
    const totalSeconds = durationMinutes * 60;
    const remaining = totalSeconds - elapsed;

    if (remaining <= 0) {
        return { remainingSeconds: 0, isTimeUp: true };
    }

    return { remainingSeconds: remaining, isTimeUp: false };
}

/**
 * Check if a duration has been exceeded
 */
function isDurationExceeded(startTime, maxSeconds, currentTime = null) {
    const now = currentTime || new Date();
    const elapsed = (now.getTime() - new Date(startTime).getTime()) / 1000;
    return elapsed >= maxSeconds;
}

module.exports = {
    getElapsedSeconds,
    formatDuration,
    getTimeRemaining,
    isDurationExceeded,
};

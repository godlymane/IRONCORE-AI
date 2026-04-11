/**
 * Shared color utility functions used across multiple views.
 */

/**
 * Returns a color hex for the given Iron Score value.
 * Used in DashboardView, ProfileHub, and anywhere Iron Score is displayed.
 */
export const getIronScoreColor = (score) => {
  if (score >= 80) return '#eab308'; // gold
  if (score >= 60) return '#f97316'; // orange
  if (score >= 30) return '#dc2626'; // red
  return '#6b7280'; // grey
};

/**
 * Resolves user weight from profile or most recent progress entry.
 * Duplicated logic was in CardioView, CoachView, and AILabView — now centralized here.
 *
 * @param {object} profile - User profile object (must have .weight if available)
 * @param {Array}  progress - Array of progress log entries (with .createdAt?.seconds and .weight)
 * @returns {number|undefined} The resolved weight in kg, or undefined if none found
 */
export const resolveWeight = (profile, progress) => {
  if (profile?.weight) return profile.weight;
  return [...progress]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .find(p => p.weight)?.weight;
};

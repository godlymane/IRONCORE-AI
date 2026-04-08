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

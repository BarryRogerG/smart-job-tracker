import { getStartOfWeek } from "./date.js";

/**
 * Monday (local time) that starts the calendar week for a date-like value.
 * Returns `null` when the input is missing or invalid.
 */
export function startOfWeek(input) {
  if (input == null) return null;

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  return getStartOfWeek(date);
}

/**
 * `{ from, to }` date range for the analytics "Applications per week" chart:
 * trailing six calendar weeks ending at `referenceDate` (same window as the
 * previous inline logic: `to` = today, `from` = today minus 5×7 days).
 *
 * @param {Date} [referenceDate]
 * @returns {{ from: Date, to: Date }}
 */
export function getAnalyticsWeeklyJobsRange(referenceDate = new Date()) {
  const to = new Date(referenceDate);
  const from = new Date(to);
  from.setDate(to.getDate() - 5 * 7);
  return { from, to };
}

/**
 * Avatar initials from a display name or email fragment.
 */
export function getInitials(value) {
  const input = (value ?? "").trim();
  if (!input) return "U";

  const base = input.includes("@") ? input.split("@")[0] : input;
  const parts = base.split(/[^a-zA-Z0-9]+/).filter(Boolean);

  if (parts.length === 0) return input.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

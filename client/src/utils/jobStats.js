import { getStartOfWeek } from "./date.js";

export const INITIAL_COUNTS = {
  applied: 0,
  interviewing: 0,
  offer: 0,
  rejected: 0,
};

export function normalizeStatus(status) {
  if (!status) return null;
  const normalized = String(status).trim().toLowerCase();
  return normalized === "offered" ? "offer" : normalized;
}

export function getJobTotals(jobs = []) {
  const counts = { ...INITIAL_COUNTS };

  jobs.forEach((job) => {
    const status = normalizeStatus(job?.status);
    if (status && Object.prototype.hasOwnProperty.call(counts, status)) {
      counts[status] += 1;
    }
  });

  return counts;
}

// Format a Date as a local-time YYYY-MM-DD string. Using local components
// (instead of toISOString) keeps the bucket key aligned with the user's
// timezone, so a job applied at 11pm Sunday local time still falls in the
// week the user thinks of as "this week".
function toLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}


// Coerce any date-like input (Date | string | number | null) into the Monday
// (local time) that starts its week, or null if the input is missing/invalid.
// Wraps `getStartOfWeek` from utils/date.js so callers don't have to validate.
function startOfWeek(input) {
  if (input == null) return null;

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  return getStartOfWeek(date);
}
/**
 * Groups jobs into weekly buckets anchored to Monday (local time) and returns
 * a sorted array of `{ week, count }`. Weeks with no applications between the
 * earliest and latest observed week are filled with `count: 0` so charts
 * render a continuous timeline.
 *
 * `week` is a YYYY-MM-DD string for the Monday of that week. Strings sort
 * lexicographically in chronological order, which keeps the array trivially
 * sortable and easy to use as React keys.
 *
 * @param {Array<{ appliedDate?: string|Date|number }>} jobs
 * @param {Object} [options]
 * @param {Date|string|number} [options.from] Force the earliest week (inclusive).
 * @param {Date|string|number} [options.to]   Force the latest week (inclusive).
 *   Useful for fixed-window views like "last 6 weeks" — pass `from` set to
 *   5 weeks ago and `to` set to today.
 * @returns {Array<{ week: string, count: number }>}
 *
 * @example
 *   aggregateJobsByWeek([
 *     { appliedDate: "2026-04-06" }, // Mon
 *     { appliedDate: "2026-04-08" }, // Wed (same week)
 *     { appliedDate: "2026-04-20" }, // skip a week
 *   ]);
 *   // => [
 *   //   { week: "2026-04-06", count: 2 },
 *   //   { week: "2026-04-13", count: 0 },
 *   //   { week: "2026-04-20", count: 1 },
 *   // ]
 */
export function aggregateJobsByWeek(jobs, { from, to } = {}) {
  const list = Array.isArray(jobs) ? jobs : [];

  const counts = new Map();
  let earliest = null;
  let latest = null;

  for (const job of list) {
    const monday = startOfWeek(job?.appliedDate);
    if (!monday) continue;

    const key = toLocalISODate(monday);
    counts.set(key, (counts.get(key) || 0) + 1);

    if (!earliest || monday < earliest) earliest = monday;
    if (!latest || monday > latest) latest = monday;
  }

  const start = startOfWeek(from) ?? earliest;
  const end = startOfWeek(to) ?? latest;

  if (!start || !end || start > end) return [];

  const result = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const key = toLocalISODate(cursor);

    result.push({
      week: key,
      count: counts.get(key) ?? 0,
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  return result;
}

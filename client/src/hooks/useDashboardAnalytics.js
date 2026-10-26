import { useMemo } from "react";
import { STAGES } from "../utils/jobStages.js";
import { aggregateJobsByWeek, getJobTotals } from "../utils/jobStats.js";
import { getAnalyticsWeeklyJobsRange } from "../utils/dashboardHelpers.js";

const EMPTY_JOBS = [];

/**
 * Memoized dashboard analytics derived from a job list (e.g. all jobs or a
 * filtered "display" slice).
 *
 * @param {Array<object>} displayJobs
 * @returns {{
 *   applicationsPerWeek: Array<{ key: string, label: string, count: number }>,
 *   statusBreakdown: { rows: Array<object>, gradient: string },
 *   totals: Record<string, number>,
 * }}
 */
export function useDashboardAnalytics(displayJobs) {
  const jobs = Array.isArray(displayJobs) ? displayJobs : EMPTY_JOBS;

  const totals = useMemo(() => getJobTotals(jobs), [jobs]);

  const applicationsPerWeek = useMemo(() => {
    const { from, to } = getAnalyticsWeeklyJobsRange();
    return aggregateJobsByWeek(jobs, { from, to }).map((row) => {
      const monday = new Date(row.week);
      return {
        key: row.week,
        label: `${monday.getMonth() + 1}/${monday.getDate()}`,
        count: row.count,
      };
    });
  }, [jobs]);

  const statusBreakdown = useMemo(() => {
    const total = jobs.length;
    const rows = STAGES.map((stage) => {
      const count = totals[stage.key] ?? 0;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return { ...stage, count, percent };
    });

    if (total === 0) {
      return { rows, gradient: "conic-gradient(#e5e7eb 0deg 360deg)" };
    }

    let currentDeg = 0;
    const segments = rows
      .map((row) => {
        const delta = (row.count / total) * 360;
        const start = currentDeg;
        const end = currentDeg + delta;
        currentDeg = end;
        return `${row.chartColor} ${start}deg ${end}deg`;
      })
      .join(", ");

    return { rows, gradient: `conic-gradient(${segments})` };
  }, [jobs, totals]);

  return { applicationsPerWeek, statusBreakdown, totals };
}

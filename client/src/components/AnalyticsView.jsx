import { useMemo } from "react";
import AnalyticsEmptyState from "./AnalyticsEmptyState.jsx";
import CountUp from "./CountUp.jsx";
import TimeInStatusCard from "./TimeInStatusCard.jsx";
import { useJobs } from "../context/JobContext.jsx";
import { STAGES } from "../utils/jobStages.js";
import { aggregateJobsByWeek, getJobTotals } from "../utils/jobStats.js";

/**
 * Analytics tab. Owns the three derived views (weekly bars, status donut,
 * funnel rates) since they're only consumed here. Reads `jobs` from context
 * so the only prop is the CTA to open the Add-Job dialog (which lives on
 * the page).
 */
export default function AnalyticsView({ onAddJob }) {
  const { jobs } = useJobs();
  const totals = useMemo(() => getJobTotals(jobs), [jobs]);

  const applicationsPerWeek = useMemo(() => {
    const today = new Date();
    const sixWeeksAgo = new Date(today);
    sixWeeksAgo.setDate(today.getDate() - 5 * 7);

    return aggregateJobsByWeek(jobs, { from: sixWeeksAgo, to: today }).map(
      (row) => {
        const monday = new Date(row.week);
        return {
          key: row.week,
          label: `${monday.getMonth() + 1}/${monday.getDate()}`,
          count: row.count,
        };
      }
    );
  }, [jobs]);

  const statusBreakdown = useMemo(() => {
    const total = (jobs || []).length;
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

  const funnelMetrics = useMemo(() => {
    const total = jobs.length || 0;
    const toPercent = (value, base) =>
      base > 0 ? Math.round((value / base) * 100) : 0;

    return {
      total,
      interviewRate: toPercent(totals.interviewing ?? 0, total),
      offerRate: toPercent(totals.offer ?? 0, total),
      // Conversion is undefined without any interviews, so report 0 instead
      // of dividing by a fudge factor — keeps the metric honest when the
      // pipeline is brand new.
      conversionToOffer:
        (totals.interviewing ?? 0) > 0
          ? toPercent(totals.offer ?? 0, totals.interviewing)
          : 0,
      activeRate: toPercent(total - (totals.rejected ?? 0), total),
    };
  }, [jobs.length, totals]);

  if (!jobs.length) {
    return (
      <AnalyticsEmptyState jobCount={jobs.length} onAddJob={onAddJob} />
    );
  }

  // Floor at 1 so the bar-height percentage formula below never divides by
  // zero when the user has jobs but none in the last 6 weeks.
  const maxWeekCount = Math.max(
    1,
    ...applicationsPerWeek.map((point) => point.count)
  );

  const funnelTiles = [
    { label: "Interview Rate", value: funnelMetrics.interviewRate },
    { label: "Offer Rate", value: funnelMetrics.offerRate },
    { label: "Interview to Offer", value: funnelMetrics.conversionToOffer },
    { label: "Active Pipeline", value: funnelMetrics.activeRate },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
          <h2 className="text-lg font-medium text-text-body">
            Applications per week
          </h2>
          <p className="mt-1 text-sm text-text-hint">
            Last 6 weeks of application volume.
          </p>
          <div className="mt-5">
            <div className="flex h-36 items-end gap-2 rounded-lg bg-slate-50 p-3">
              {applicationsPerWeek.map((point) => {
                const heightPct = Math.max(
                  8,
                  Math.round((point.count / maxWeekCount) * 100)
                );
                return (
                  <div
                    key={point.key}
                    className="flex flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div
                      className="w-full rounded-md bg-blue-500/90 transition-all duration-200 hover:bg-blue-600"
                      style={{ height: `${heightPct}%` }}
                      title={`${point.count} application(s)`}
                    />
                    <span className="text-xs text-text-hint">{point.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
          <h2 className="text-lg font-medium text-text-body">
            Status distribution
          </h2>
          <p className="mt-1 text-sm text-text-hint">
            Share of applications by stage.
          </p>

          <div className="mt-5 flex items-center gap-6">
            <div
              className="relative h-28 w-28 rounded-full"
              style={{ background: statusBreakdown.gradient }}
            >
              <div className="absolute inset-3 rounded-full bg-white" />
            </div>
            <div className="space-y-2">
              {statusBreakdown.rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center gap-2 text-sm text-text-muted"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${row.classes.legendDot}`}
                  />
                  <span className="min-w-24">{row.label}</span>
                  <span className="font-medium text-text-primary">
                    {row.count}
                  </span>
                  <span className="text-text-hint">({row.percent}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
          <h2 className="text-lg font-medium text-text-body">
            Pipeline Summary
          </h2>
          <p className="mt-1 text-sm text-text-hint">
            A quick breakdown by application status.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {STAGES.map(({ key, label, icon: Icon, classes }) => (
              <div
                key={key}
                className={`rounded-xl border border-slate-200 ${classes.bg} p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${classes.label}`}>
                    {label}
                  </p>
                  <Icon size={18} aria-hidden="true" className={classes.icon} />
                </div>
                <p className={`mt-1 text-2xl font-bold ${classes.number}`}>
                  <CountUp value={totals[key]} />
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
          <h2 className="text-lg font-medium text-text-body">Next Steps</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-body">
            <li className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-1 h-2 w-2 rounded-full bg-yellow-500"
              />
              Apply to new roles when your pipeline is thin.
            </li>
            <li className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-1 h-2 w-2 rounded-full bg-blue-600"
              />
              Prepare notes for interviewing candidates.
            </li>
            <li className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-1 h-2 w-2 rounded-full bg-green-600"
              />
              Follow up quickly after offers.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
        <h2 className="text-lg font-medium text-text-body">
          Hiring funnel conversion
        </h2>
        <p className="mt-1 text-sm text-text-hint">
          Conversion checkpoints inspired by ATS pipeline tracking.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {funnelTiles.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-text-hint">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">
                {value}%
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <TimeInStatusCard />
      </section>
    </div>
  );
}

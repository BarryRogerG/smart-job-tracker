import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Clock3,
  PlusCircle,
  TrendingUp,
} from "lucide-react";

const FEATURE_TILES = [
  {
    icon: TrendingUp,
    title: "Conversion rate",
    description: "Applied → Interview → Offer percentages.",
  },
  {
    icon: BarChart3,
    title: "Weekly activity",
    description: "See how consistent your outreach is.",
  },
  {
    icon: Clock3,
    title: "Time in stage",
    description: "Average days between each transition.",
  },
];

/**
 * Shown in the Analytics tab when the user has no (or almost no) jobs yet.
 * Nudges them back to the Dashboard form with a single clear call to action.
 */
export default function AnalyticsEmptyState({
  jobCount = 0,
  onAddJob,
  threshold = 1,
}) {
  const hasSome = jobCount >= threshold;
  const headline = hasSome
    ? "Add a few more to unlock conversion rate"
    : "No analytics data yet";
  const subhead = hasSome
    ? `You have ${jobCount} application on record. Add a few more and we'll chart your Applied → Interview → Offer conversion rate here.`
    : "Charts, conversion rates, and time-in-stage metrics light up as soon as you log your first few applications.";
  const ctaLabel = hasSome ? "Add another application" : "Add your first application";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-dashed border-blue-200 bg-gradient-to-br from-blue-50 via-white to-white p-8 text-center shadow-sm sm:p-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-100/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-indigo-100/50 blur-3xl"
      />

      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-sm">
        <motion.span
          initial={{ scale: 0.9 }}
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ClipboardList size={30} />
        </motion.span>
      </div>

      <h2 className="relative mt-6 text-2xl font-semibold tracking-tight text-text-primary">
        {headline}
      </h2>
      <p className="relative mx-auto mt-2 max-w-lg text-sm text-text-muted">
        {subhead}
      </p>

      <div className="relative mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
        {FEATURE_TILES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-gray-200 bg-white/80 p-4 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <Icon size={18} className="text-blue-500" />
            <p className="mt-2 text-sm font-medium text-gray-800">{title}</p>
            <p className="mt-1 text-xs text-text-hint">{description}</p>
          </div>
        ))}
      </div>

      <motion.button
        type="button"
        onClick={onAddJob}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <PlusCircle size={18} />
        {ctaLabel}
        <ArrowRight size={16} />
      </motion.button>

      <p className="relative mt-4 text-xs text-text-hint">
        Tip: even 3-5 applications is enough to start seeing meaningful trends.
      </p>
    </motion.div>
  );
}

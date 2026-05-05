import { CheckCircle2, Clock3, Send, XCircle } from "lucide-react";

// Stable id used as the dnd-kit droppable id prefix for the four stat-card
// drop zones at the top of the dashboard. Kept outside the components so the
// page-level collision-detection helper can recognize ids by string prefix.
export const SUMMARY_DROP_PREFIX = "summary-drop:";

// Single source of truth for the four pipeline stages. Used by:
//   - the drop-zone stat row at the top of the dashboard
//   - the Pipeline Summary tiles inside AnalyticsView
//   - the donut-chart legend (statusBreakdown)
//   - the Kanban board columns
//   - the status badge / card-tone helpers in utils/jobStatus.js
//
// Each stage owns a `classes` bag keyed by visual context, so a component
// reaches for the variant it needs (`badge`, `cardTone`, `kanbanTone`, etc.)
// instead of hand-assembling Tailwind class strings. Tailwind class strings
// are spelled out in full (not interpolated) so the JIT compiler picks them
// up at build time.
export const STAGES = [
  {
    key: "applied",
    label: "Applied",
    icon: Send,
    chartColor: "#ca8a04",
    classes: {
      label: "text-yellow-700",
      icon: "text-yellow-500",
      number: "text-yellow-900",
      bg: "bg-yellow-50",
      legendDot: "bg-yellow-100",
      // Saturated pill used inside list/compact cards (Light bg, dark text).
      badge: "bg-yellow-100 text-yellow-800",
      // Muted card-surface tone used by CompactJobCard backgrounds.
      cardTone: "bg-yellow-50 border-yellow-100",
      // Kanban column container — same surface as cardTone but adds a darker
      // text color so the column header stays legible against the tinted bg.
      kanbanTone: "bg-yellow-50 text-yellow-800 border-yellow-100",
    },
  },
  {
    key: "interviewing",
    label: "Interviewing",
    icon: Clock3,
    chartColor: "#1d4ed8",
    classes: {
      label: "text-blue-700",
      icon: "text-blue-500",
      number: "text-blue-900",
      bg: "bg-blue-50",
      legendDot: "bg-blue-100",
      badge: "bg-blue-100 text-blue-800",
      cardTone: "bg-blue-50 border-blue-100",
      kanbanTone: "bg-blue-50 text-blue-800 border-blue-100",
    },
  },
  {
    key: "offer",
    label: "Offered",
    icon: CheckCircle2,
    chartColor: "#15803d",
    classes: {
      label: "text-green-700",
      icon: "text-green-500",
      number: "text-green-900",
      bg: "bg-green-50",
      legendDot: "bg-green-100",
      badge: "bg-green-100 text-green-700",
      cardTone: "bg-green-50 border-green-100",
      kanbanTone: "bg-green-50 text-green-700 border-green-100",
    },
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: XCircle,
    chartColor: "#b91c1c",
    classes: {
      label: "text-red-700",
      icon: "text-red-500",
      number: "text-red-900",
      bg: "bg-red-50",
      legendDot: "bg-red-100",
      badge: "bg-red-100 text-red-700",
      cardTone: "bg-red-50 border-red-100",
      kanbanTone: "bg-red-50 text-red-700 border-red-100",
    },
  },
];

export const SUMMARY_STAGE_ORDER = STAGES.map((stage) => stage.key);

// O(1) lookup by status key. Computed once at module load so the helpers in
// jobStatus.js don't have to scan the array on every render.
export const STAGE_BY_KEY = Object.fromEntries(
  STAGES.map((stage) => [stage.key, stage])
);

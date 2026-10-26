export function getJobsSectionMeta(jobsView) {
  if (jobsView === "kanban") {
    return {
      title: "Job Pipeline",
      subtitle: "Drag cards across stages to move your ATS funnel.",
    };
  }

  return {
    title: "Job Applications",
    subtitle: "Track applications, interviews, and offers in one place.",
  };
}

/**
 * Shared title row for list/kanban job panels. Accepts a view toggle and
 * optional trailing content (e.g. job count).
 */
export default function JobsSectionHeader({
  jobsView,
  headerAction,
  trailing,
}) {
  const { title, subtitle } = getJobsSectionMeta(jobsView);

  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-hint">{subtitle}</p>
      </div>
      {headerAction || trailing ? (
        <div className="flex shrink-0 items-center gap-3">
          {headerAction}
          {trailing}
        </div>
      ) : null}
    </header>
  );
}

import { Columns3, LayoutList } from "lucide-react";

function ViewButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition sm:px-3 ${
        active
          ? "bg-white text-blue-700 shadow-sm"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      <Icon size={15} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * Segmented List / Kanban control. Icon-only on small screens; labels from sm+.
 */
export default function JobsViewToggle({ jobsView, setJobsView }) {
  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1"
      role="group"
      aria-label="Job view"
    >
      <ViewButton
        active={jobsView === "list"}
        onClick={() => setJobsView("list")}
        icon={LayoutList}
        label="List"
      />
      <ViewButton
        active={jobsView === "kanban"}
        onClick={() => setJobsView("kanban")}
        icon={Columns3}
        label="Kanban"
      />
    </div>
  );
}

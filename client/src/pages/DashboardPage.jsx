import { useMemo, useRef, useState } from "react";
import { DndContext } from "@dnd-kit/core";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  LayoutDashboard,
  Search,
  Settings,
  Briefcase,
  Sparkles,
  Send,
  Clock3,
  CheckCircle2,
  XCircle,
  LogOut,
  Trash2,
} from "lucide-react";
import CountUp from "../components/CountUp.jsx";
import DeletedItemsView from "../components/DeletedItemsView.jsx";
import JobForm from "../components/JobForm.jsx";
import JobList from "../components/JobList.jsx";
import JobsSectionHeader from "../components/JobsSectionHeader.jsx";
import JobsViewToggle from "../components/JobsViewToggle.jsx";
import KanbanBoard from "../components/KanbanBoard.jsx";
import StatusSummaryDropZone from "../components/StatusSummaryDropZone.jsx";
import TrashDropZone from "../components/TrashDropZone.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useJobs } from "../context/JobContext.jsx";
import { useDashboardAnalytics } from "../hooks/useDashboardAnalytics.js";
import { useDashboardDragDrop } from "../hooks/useDashboardDragDrop.js";
import { useJobsViewPreference } from "../hooks/useJobsViewPreference.js";
import { STAGES } from "../utils/jobStages.js";
import { toLocalISODate } from "../utils/jobStats.js";
import { statusLabel } from "../utils/jobStatus.js";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-3 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:py-2";

function DashboardPage() {
  const { logout, user } = useAuth();
  const {
    jobs,
    isMock,
    error,
    isLoading,
    isSubmitting,
    createJob,
    updateJob,
    deleteJob,
    clearError,
    toast,
    clearToast,
  } = useJobs();

  const reducedMotion = useReducedMotion();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobsView, setJobsView] = useJobsViewPreference();
  const formSectionRef = useRef(null);

  const [editingJob, setEditingJob] = useState(null);
  const [editState, setEditState] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEdit = (job) => {
    setEditingJob(job);
    setEditState({
      company: job.company || "",
      role: job.role || "",
      status: job.status || "applied",
      appliedDate: job.appliedDate
        ? toLocalISODate(new Date(job.appliedDate))
        : toLocalISODate(new Date()),
      notes: job.notes || "",
      link: job.link || "",
    });
  };

  const closeEdit = () => {
    setEditingJob(null);
    setEditState(null);
    setIsSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editingJob || !editState) return;

    setIsSavingEdit(true);
    clearError();
    try {
      await updateJob(editingJob.id, {
        ...editState,
        // `type="date"` is YYYY-MM-DD; parse at local noon so we don't use ES
        // date-only parsing (UTC midnight), which can shift the calendar day.
        appliedDate: editState.appliedDate
          ? new Date(`${editState.appliedDate}T12:00:00`).toISOString()
          : undefined,
        link: editState.link || undefined,
        notes: editState.notes || undefined,
      });
      closeEdit();
    } catch {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (job) => {
    const confirmed = window.confirm(
      `Delete ${job.company} — ${job.role}? This cannot be undone.`
    );
    if (!confirmed) return;

    clearError();
    try {
      await deleteJob(job);
    } catch {
      /* JobContext sets error + toast on failure */
    }
  };

 const filteredJobs = useMemo(() => {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return jobs;

  return jobs.filter((job) => {
    const searchableText = [
      job.company,
      job.role,
      job.status,
      job.notes,
      job.link,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(q);
  });
}, [jobs, searchQuery]);

  const { applicationsPerWeek, statusBreakdown, totals } =
    useDashboardAnalytics(jobs);

  const getInitials = (value) => {
  const input = (value ?? "").trim();
  if (!input) return "U";
  const base = input.includes("@") ? input.split("@")[0] : input;
  const parts = base.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) {
    return input.slice(0, 2).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

  const avatarInitials = getInitials(user?.name || user?.email || "U");

  const canEditDelete = !isMock;

  const {
    dndContextProps,
    dragOverlayProps,
    listDragProps,
    kanbanDragProps,
    summaryDropProps,
    trashDropProps,
    DragOverlay,
  } = useDashboardDragDrop({
    canEditDelete,
    updateJob,
    deleteJob,
  });

  const focusCreateForm = () => {
    setActiveNav("dashboard");
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const jobsViewToggle = (
    <JobsViewToggle jobsView={jobsView} setJobsView={setJobsView} />
  );

  const renderJobsPanel = () => {
    if (isLoading) {
      return (
        <section className="space-y-4">
          <JobsSectionHeader jobsView={jobsView} headerAction={jobsViewToggle} />
          <p className="text-gray-500">Loading jobs...</p>
        </section>
      );
    }

    if (jobsView === "kanban") {
      return (
        <KanbanBoard
          jobs={filteredJobs}
          onEdit={canEditDelete ? openEdit : undefined}
          onDelete={canEditDelete ? handleDelete : undefined}
          headerAction={jobsViewToggle}
          {...kanbanDragProps}
        />
      );
    }

    return (
      <JobList
        jobs={filteredJobs}
        onEdit={canEditDelete ? openEdit : undefined}
        onDelete={canEditDelete ? handleDelete : undefined}
        headerAction={jobsViewToggle}
        {...listDragProps}
      />
    );
  };

  return (
    <DndContext {...dndContextProps}>
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-gray-100 lg:flex-row">
      <aside className="w-full border-b border-gray-100 bg-white shadow-sm lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-4 py-3 lg:px-6 lg:py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              Smart Job Tracker
            </p>
            <p className="hidden truncate text-xs text-gray-500 sm:block">
              Track progress end-to-end
            </p>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:block lg:pb-0">
          <button
            type="button"
            onClick={() => setActiveNav("dashboard")}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition duration-200 lg:mb-2 lg:w-full lg:gap-3 ${
              activeNav === "dashboard"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-50"
            } hover:shadow-sm active:scale-95`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveNav("jobs")}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition duration-200 lg:mb-2 lg:w-full lg:gap-3 ${
              activeNav === "jobs"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-50"
            } hover:shadow-sm active:scale-95`}
          >
            <Briefcase size={16} />
            Jobs
          </button>
          <button
            type="button"
            onClick={() => setActiveNav("analytics")}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition duration-200 lg:mb-2 lg:w-full lg:gap-3 ${
              activeNav === "analytics"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-50"
            } hover:shadow-sm active:scale-95`}
          >
            <BarChart3 size={16} />
            Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveNav("deleted")}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition duration-200 lg:hidden ${
              activeNav === "deleted"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-50"
            } active:scale-95`}
          >
            <Trash2 size={16} />
            Deleted
          </button>
        </nav>

        <div className="mt-2 hidden px-3 pb-6 lg:mt-6 lg:block">
          <TrashDropZone
            activeNav={activeNav}
            setActiveNav={setActiveNav}
            {...trashDropProps}
          />
          <button
            type="button"
            onClick={logout}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-95"
          >
            Logout
          </button>
          {!isMock ? (
            <div className="mt-3 px-3 text-xs text-gray-500">
              Connected to your DB
            </div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center justify-between gap-3 p-4 sm:gap-6 sm:p-6">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-gray-900 sm:text-2xl">
                {activeNav === "dashboard"
                  ? "Dashboard"
                  : activeNav === "jobs"
                    ? "Jobs"
                    : activeNav === "deleted"
                      ? "Deleted Items"
                    : "Analytics"}
              </h1>
              <p className="truncate text-sm text-gray-500">
                {user?.email}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 sm:flex-1 sm:gap-4">
              <div className="relative hidden w-full max-w-md sm:block">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-11 pr-3 text-gray-900 outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  placeholder="Search jobs by company, role, status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={focusCreateForm}
                className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-blue-700 hover:shadow active:scale-95 sm:px-4"
              >
                Add Job
              </button>

              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                  {avatarInitials}
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-gray-700 transition duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-95 lg:hidden"
                  onClick={logout}
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
                <button
                  type="button"
                  className="hidden rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-95 sm:inline-flex"
                  onClick={clearError}
                  aria-label="Settings"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 px-4 pb-3 pt-2 sm:hidden">
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-3 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
          </div>
        </header>

        <main className="flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8">
          {error ? (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {activeNav === "deleted" ? (
            <DeletedItemsView />
          ) : null}

          {activeNav === "analytics" ? (
            <div className="space-y-4">
              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <h2 className="text-lg font-medium text-gray-700">
                    Applications per week
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Last 6 weeks of application volume.
                  </p>
                  <div className="mt-5">
                    <div className="flex h-36 items-end gap-2 rounded-lg bg-gray-50 p-3">
                      {applicationsPerWeek.map((point) => {
                        const maxCount = Math.max(
                          1,
                          ...applicationsPerWeek.map((item) => item.count)
                        );
                        const heightPct = Math.max(
                          8,
                          Math.round((point.count / maxCount) * 100)
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
                            <span className="text-xs text-gray-500">{point.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <h2 className="text-lg font-medium text-gray-700">
                    Status distribution
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Share of applications by stage.
                  </p>

                  <div className="mt-5 flex items-center gap-6">
                    <div className="relative h-28 w-28 rounded-full" style={{ background: statusBreakdown.gradient }}>
                      <div className="absolute inset-3 rounded-full bg-white" />
                    </div>
                    <div className="space-y-2">
                      {statusBreakdown.rows.map((row) => (
                        <div key={row.key} className="flex items-center gap-2 text-sm text-gray-600">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${row.classes.legendDot}`}
                          />
                          <span className="min-w-24">{row.label}</span>
                          <span className="font-medium text-gray-800">{row.count}</span>
                          <span className="text-gray-500">({row.percent}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <h2 className="text-lg font-medium text-gray-700">
                  Pipeline Summary
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  A quick breakdown by application status.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-300 bg-yellow-50 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-yellow-700">Applied</p>
                      <Send size={18} className="text-yellow-500" />
                    </div>
                    <p className="mt-1 text-2xl font-bold text-yellow-900">
                      <CountUp value={totals.applied} />
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-300 bg-blue-50 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-700">
                        Interviewing
                      </p>
                      <Clock3 size={18} className="text-blue-500" />
                    </div>
                    <p className="mt-1 text-2xl font-bold text-blue-900">
                      <CountUp value={totals.interviewing} />
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-300 bg-green-50 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-green-700">Offered</p>
                      <CheckCircle2 size={18} className="text-green-500" />
                    </div>
                    <p className="mt-1 text-2xl font-bold text-green-900">
                      <CountUp value={totals.offer} />
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-300 bg-red-50 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-red-700">Rejected</p>
                      <XCircle size={18} className="text-red-500" />
                    </div>
                    <p className="mt-1 text-2xl font-bold text-red-900">
                      <CountUp value={totals.rejected} />
                    </p>
                  </div>
                </div>
                </div>

                <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <h2 className="text-lg font-medium text-gray-700">
                  Next Steps
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-yellow-500" />
                    Apply to new roles when your pipeline is thin.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                    Prepare notes for interviewing candidates.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-green-600" />
                    Follow up quickly after offers.
                  </li>
                </ul>
                </div>
              </section>
            </div>
          ) : null}

          {activeNav !== "analytics" && activeNav !== "deleted" ? (
            <div className="space-y-4">
              {activeNav === "dashboard" ? (
                <>
                  {/* Top = stats */}
                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {STAGES.map((stage) => {
                      const Icon = stage.icon;
                      const count = totals[stage.key] ?? 0;
                      return (
                        <StatusSummaryDropZone
                          key={stage.key}
                          stageKey={stage.key}
                          {...summaryDropProps}
                          className={`rounded-xl border border-gray-300 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${stage.classes.bg}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className={`text-sm ${stage.classes.label}`}>
                              {stage.label}
                            </p>
                            <Icon size={18} className={stage.classes.icon} />
                          </div>
                          <p className={`mt-1 text-2xl font-bold ${stage.classes.number}`}>
                            <CountUp value={count} />
                          </p>
                          {canEditDelete ? (
                            <p className="mt-2 text-xs text-gray-500">
                              Drop matching cards here to file
                            </p>
                          ) : null}
                        </StatusSummaryDropZone>
                      );
                    })}
                  </section>

                  {/* Left = form (smaller), Right = job list (bigger) */}
                  <div className="grid gap-8 lg:grid-cols-10">
                    <div ref={formSectionRef} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-3">
                      <JobForm onSubmit={createJob} isSubmitting={isSubmitting} />
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-7">
                      {renderJobsPanel()}
                    </div>
                  </div>
                </>
              ) : null}

              {activeNav === "jobs" ? renderJobsPanel() : null}
            </div>
          ) : null}
        </main>
      </div>

      {editingJob && editState ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-300 bg-white p-6 shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-700">
                  Edit job
                </h3>
                <p className="text-sm text-gray-500">
                  Update details and save changes.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition duration-200 hover:bg-gray-50 active:scale-95"
                onClick={closeEdit}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className={`${inputClass} font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400`}
                name="company"
                placeholder="Company"
                value={editState.company}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    company: e.target.value,
                  }))
                }
              />
              <input
                className={`${inputClass} text-sm text-gray-500 placeholder:text-gray-400`}
                name="role"
                placeholder="Role"
                value={editState.role}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
              />
              <select
                className={`${inputClass} bg-white`}
                name="status"
                value={editState.status}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
              >
                <option value="applied">Applied</option>
                <option value="interviewing">Interviewing</option>
                <option value="offer">Offered</option>
                <option value="rejected">Rejected</option>
              </select>
              <input
                className={inputClass}
                type="date"
                name="appliedDate"
                value={editState.appliedDate}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    appliedDate: e.target.value,
                  }))
                }
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                type="url"
                name="link"
                placeholder="Job link (optional)"
                value={editState.link}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    link: e.target.value,
                  }))
                }
              />
              <textarea
                className={`min-h-24 ${inputClass} mt-2 text-sm text-gray-600 placeholder:text-gray-400 sm:col-span-2`}
                name="notes"
                placeholder="Notes"
                value={editState.notes}
                onChange={(e) =>
                  setEditState((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition duration-200 hover:bg-gray-50 active:scale-95"
                onClick={closeEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-blue-700 hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>

    <DragOverlay dropAnimation={null}>
      {dragOverlayProps.draggingJob ? (
        <div
          className={`w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl ${
            reducedMotion ? "" : "rotate-[-1deg] scale-105 opacity-90"
          }`}
        >
          <p className="truncate text-sm font-semibold text-gray-900">
            {dragOverlayProps.draggingJob.company}
          </p>
          <p className="truncate text-xs text-gray-500">
            {dragOverlayProps.draggingJob.role}
          </p>
          <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
            {statusLabel(dragOverlayProps.draggingJob.status)}
          </span>
        </div>
      ) : null}
    </DragOverlay>

    <AnimatePresence>
      {toast ? (
        <Motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className={`fixed bottom-6 left-1/2 z-[60] max-w-md -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
          role="status"
        >
          <div className="flex items-center justify-between gap-4">
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={clearToast}
              className="text-xs font-medium opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
    </DndContext>
  );
}

export default DashboardPage;

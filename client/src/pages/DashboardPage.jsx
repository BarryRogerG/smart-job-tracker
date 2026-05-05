import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  XCircle,
} from "lucide-react";
import AnalyticsView from "../components/AnalyticsView.jsx";
import CountUp from "../components/CountUp.jsx";
import DeletedItemsView from "../components/DeletedItemsView.jsx";
import Dialog from "../components/Dialog.jsx";
import JobForm from "../components/JobForm.jsx";
import JobList from "../components/JobList.jsx";
import KanbanBoard from "../components/KanbanBoard.jsx";
import {
  JobListSkeleton,
  StatsSkeleton,
} from "../components/Skeleton.jsx";
import StatusSummaryDropZone from "../components/StatusSummaryDropZone.jsx";
import TrashDropZone from "../components/TrashDropZone.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useJobs } from "../context/JobContext.jsx";
import {
  STAGES,
  SUMMARY_DROP_PREFIX,
  SUMMARY_STAGE_ORDER,
} from "../utils/jobStages.js";
import { getJobTotals, normalizeStatus } from "../utils/jobStats.js";

// === Module-level constants =================================================

const VIEW_OPTIONS = [
  { key: "list", label: "List" },
  { key: "compact", label: "Compact" },
  { key: "kanban", label: "Kanban" },
];

const PAGE_TITLES = {
  dashboard: "Dashboard",
  jobs: "Jobs",
  analytics: "Analytics",
  deleted: "Deleted Items",
};

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

// === Pure helpers ===========================================================

function getInitials(value) {
  const input = (value ?? "").trim();
  if (!input) return "U";

  const base = input.includes("@") ? input.split("@")[0] : input;
  const parts = base.split(/[^a-zA-Z0-9]+/).filter(Boolean);

  if (parts.length === 0) return input.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// dnd-kit's built-in collision detection treats every drop zone uniformly,
// but the summary drop zones at the top need to be matched against pointer
// coordinates against their *DOM rects* — that's how we make the "release on
// the matching stage" UX feel snappy. This helper iterates the four known
// zones and returns the closest one whose rect contains the pointer.
function hitSummaryZoneFromRects(clientX, clientY, zonesRef) {
  const zones = zonesRef.current;
  const hits = [];
  for (const key of SUMMARY_STAGE_ORDER) {
    const el = zones[key];
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    ) {
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;
      const d = (clientX - cx) ** 2 + (clientY - cy) ** 2;
      hits.push({ key, d });
    }
  }
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.d - b.d);
  return hits[0].key;
}

// Custom collision strategy that:
//   1. Always lets the trash zone win if rect-intersected (so dragging onto
//      the sidebar reliably arms delete).
//   2. Routes summary-status hits through the DOM rect helper, but only for
//      cards whose status already matches the zone (the visual treatment for
//      mismatched zones is "dimmed", not "highlighted").
//   3. Falls back to pointerWithin for stage columns / list reordering.
function buildCollisionDetection(getLastPointer, getSummaryZonesRef) {
  return function collisionDetectionStrategy(args) {
    const rectHits = rectIntersection(args);
    const trashHit = rectHits.find((entry) => entry.id === "trash");
    if (trashHit) {
      return [trashHit];
    }

    const activeType = args.active?.data?.current?.type;
    const point = args.pointerCoordinates ?? getLastPointer?.() ?? null;

    const job = args.active?.data?.current?.job;
    const jobStatusKey = job ? normalizeStatus(job.status) : null;

    if (
      activeType === "job" &&
      point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    ) {
      const zonesRef = getSummaryZonesRef?.();
      const domKey =
        zonesRef && typeof zonesRef === "object"
          ? hitSummaryZoneFromRects(point.x, point.y, zonesRef)
          : null;
      if (domKey && jobStatusKey && domKey === jobStatusKey) {
        const summaryId = `${SUMMARY_DROP_PREFIX}${domKey}`;
        const exists = [...args.droppableContainers].some(
          (c) => String(c.id) === summaryId
        );
        if (exists) {
          return [{ id: summaryId }];
        }
      }
    }

    let pointerHits = pointerWithin(args);
    if (activeType === "job") {
      if (!jobStatusKey) {
        pointerHits = pointerHits.filter(
          (entry) => !String(entry.id).startsWith(SUMMARY_DROP_PREFIX)
        );
      } else {
        pointerHits = pointerHits.filter((entry) => {
          const id = String(entry.id);
          if (!id.startsWith(SUMMARY_DROP_PREFIX)) return true;
          return id === `${SUMMARY_DROP_PREFIX}${jobStatusKey}`;
        });
      }
    }
    if (pointerHits.length > 0) {
      return pointerHits;
    }

    return rectHits;
  };
}

// === Main page component ====================================================

function DashboardPage() {
  const { logout, user } = useAuth();
  const {
    jobs,
    isMock,
    error,
    toast,
    isLoading,
    isSubmitting,
    createJob,
    updateJob,
    deleteJob,
    clearError,
    clearToast,
  } = useJobs();

  const [activeNav, setActiveNav] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [jobsView, setJobsView] = useState("list");
  const [isMovingJobId, setIsMovingJobId] = useState(null);
  const [isAddJobOpen, setIsAddJobOpen] = useState(false);

  const [editingJob, setEditingJob] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteJob, setPendingDeleteJob] = useState(null);
  const [draggingJob, setDraggingJob] = useState(null);
  const [draggingJobId, setDraggingJobId] = useState(null);
  const [isTrashHover, setIsTrashHover] = useState(false);
  const [isTrashArmed, setIsTrashArmed] = useState(false);
  const trashArmTimerRef = useRef(null);
  const [trashDropPulse, setTrashDropPulse] = useState(false);
  const [dropFeedback, setDropFeedback] = useState(null);
  const [hoverSummaryKey, setHoverSummaryKey] = useState(null);
  const [absorbingJobId, setAbsorbingJobId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const summaryZoneElementsRef = useRef({});
  const summaryHoverRef = useRef(null);
  const summaryPointerRafRef = useRef(null);
  const summaryPointerListenerRef = useRef(null);
  const draggingJobRef = useRef(null);
  const lastPointerClientRef = useRef(null);

  const collisionDetection = useMemo(
    () =>
      buildCollisionDetection(
        () => lastPointerClientRef.current,
        () => summaryZoneElementsRef
      ),
    []
  );

  const canEditDelete = !isMock;
  const avatarInitials = getInitials(user?.name || user?.email || "U");

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((job) => {
      const haystack = `${job.company ?? ""} ${job.role ?? ""} ${job.status ?? ""} ${job.notes ?? ""} ${job.link ?? ""}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [jobs, searchQuery]);

  const totals = useMemo(() => getJobTotals(jobs), [jobs]);

  // === Effects ==============================================================

  useEffect(() => {
    if (!draggingJob) return undefined;
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = prevCursor;
    };
  }, [draggingJob]);

  // "Arm" the trash target only after the card has hovered on it for 500ms
  // continuously, so brief fly-overs don't falsely signal "ready to delete".
  useEffect(() => {
    if (isTrashHover) {
      if (trashArmTimerRef.current == null) {
        trashArmTimerRef.current = window.setTimeout(() => {
          setIsTrashArmed(true);
          trashArmTimerRef.current = null;
        }, 500);
      }
    } else {
      if (trashArmTimerRef.current != null) {
        window.clearTimeout(trashArmTimerRef.current);
        trashArmTimerRef.current = null;
      }
      setIsTrashArmed(false);
    }

    return () => {
      if (trashArmTimerRef.current != null) {
        window.clearTimeout(trashArmTimerRef.current);
        trashArmTimerRef.current = null;
      }
    };
  }, [isTrashHover]);

  // === DnD plumbing =========================================================

  const setSummaryZoneEl = (stageKey, node) => {
    if (node) {
      summaryZoneElementsRef.current[stageKey] = node;
    } else {
      delete summaryZoneElementsRef.current[stageKey];
    }
  };

  const clearSummaryDropTracking = () => {
    if (summaryPointerRafRef.current != null) {
      cancelAnimationFrame(summaryPointerRafRef.current);
      summaryPointerRafRef.current = null;
    }
    summaryHoverRef.current = null;
    lastPointerClientRef.current = null;
    setHoverSummaryKey(null);
  };

  const scheduleSummaryPointerFlush = () => {
    if (summaryPointerRafRef.current != null) return;
    summaryPointerRafRef.current = requestAnimationFrame(() => {
      summaryPointerRafRef.current = null;
      setHoverSummaryKey(summaryHoverRef.current);
    });
  };

  const handleCardDragEnd = () => {
    if (summaryPointerListenerRef.current) {
      window.removeEventListener(
        "pointermove",
        summaryPointerListenerRef.current,
        true
      );
      summaryPointerListenerRef.current = null;
    }
    clearSummaryDropTracking();
    draggingJobRef.current = null;
    setDraggingJob(null);
    setDraggingJobId(null);
    setIsTrashHover(false);
  };

  const handleMoveJob = async (job, nextStatus) => {
    if (!canEditDelete || !job?.id) return;
    const normalizedCurrent = normalizeStatus(job.status);
    if (normalizedCurrent === nextStatus) return;

    clearError();
    setIsMovingJobId(job.id);
    try {
      await updateJob(job.id, { status: nextStatus });
    } catch {
      // context handles error + toast
    } finally {
      setIsMovingJobId(null);
    }
  };

  const handleDragStart = (event) => {
    const job = event.active.data.current?.job;
    if (!job) return;
    if (summaryPointerListenerRef.current) {
      window.removeEventListener(
        "pointermove",
        summaryPointerListenerRef.current,
        true
      );
      summaryPointerListenerRef.current = null;
    }
    clearSummaryDropTracking();
    draggingJobRef.current = job;
    setDraggingJob(job);
    setDraggingJobId(job.id);

    const activator = event.activatorEvent;
    if (activator && "clientX" in activator && "clientY" in activator) {
      lastPointerClientRef.current = {
        x: activator.clientX,
        y: activator.clientY,
      };
    }

    const onSummaryPointerMove = (ev) => {
      if (!draggingJobRef.current) return;
      lastPointerClientRef.current = { x: ev.clientX, y: ev.clientY };
      const key = hitSummaryZoneFromRects(
        ev.clientX,
        ev.clientY,
        summaryZoneElementsRef
      );
      summaryHoverRef.current = key;
      scheduleSummaryPointerFlush();
    };
    summaryPointerListenerRef.current = onSummaryPointerMove;
    window.addEventListener("pointermove", onSummaryPointerMove, true);
  };

  const handleDragOver = (event) => {
    const overId = event.over?.id;
    setIsTrashHover(overId === "trash");
  };

  const handleDragCancel = () => {
    handleCardDragEnd();
  };

  const handleDragEnd = async (event) => {
    const job = event.active.data.current?.job;
    const overId = event.over?.id;

    if (!job || !canEditDelete || !overId) {
      handleCardDragEnd();
      return;
    }

    clearError();
    try {
      if (overId === "trash") {
        await deleteJob(job);
        setTrashDropPulse(true);
        setDropFeedback("Moved to Deleted Items");
        window.setTimeout(() => setTrashDropPulse(false), 240);
        window.setTimeout(() => setDropFeedback(null), 1400);
      } else if (String(overId).startsWith("stage:")) {
        const nextStatus = String(overId).slice("stage:".length);
        const normalizedCurrent = normalizeStatus(job.status);
        if (normalizedCurrent !== nextStatus) {
          await handleMoveJob(job, nextStatus);
        }
      } else if (String(overId).startsWith(SUMMARY_DROP_PREFIX)) {
        const nextStatus = String(overId).slice(SUMMARY_DROP_PREFIX.length);
        const currentKey = normalizeStatus(job.status);
        if (currentKey != null && currentKey === nextStatus) {
          setAbsorbingJobId(job.id);
          window.setTimeout(() => setAbsorbingJobId(null), 520);
        }
      }
    } finally {
      handleCardDragEnd();
    }
  };

  // === Modal handlers =======================================================

  const openEdit = (job) => setEditingJob(job);
  const closeEdit = () => {
    setEditingJob(null);
    setIsSavingEdit(false);
  };

  const handleEditJobSubmit = async (payload) => {
    if (!editingJob) return;
    setIsSavingEdit(true);
    clearError();
    try {
      await updateJob(editingJob.id, payload);
      closeEdit();
    } catch (err) {
      setIsSavingEdit(false);
      throw err;
    }
  };

  const requestDelete = (job) => setPendingDeleteJob(job);
  const closeDeleteModal = () => setPendingDeleteJob(null);

  const confirmDelete = async () => {
    if (!pendingDeleteJob) return;
    clearError();
    try {
      await deleteJob(pendingDeleteJob);
      setPendingDeleteJob(null);
    } catch {
      /* context sets error; 401 handled by apiClient */
    }
  };

  const openAddJobDialog = () => setIsAddJobOpen(true);

  const handleAddJobSubmit = async (payload) => {
    await createJob(payload);
    setIsAddJobOpen(false);
  };

  // === Render helpers =======================================================

  const viewToggleClass = (key) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      jobsView === key
        ? "bg-blue-600 text-white shadow-sm"
        : "border border-gray-200 bg-white text-text-muted hover:bg-gray-50"
    }`;

  const navButtonClass = (key) =>
    `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition duration-200 lg:mb-2 lg:w-full ${
      activeNav === key
        ? "bg-blue-50 text-blue-700"
        : "text-text-body hover:bg-gray-50"
    } hover:shadow-sm hover:scale-[1.01] active:scale-95`;

  // Single panel reused by both `dashboard` and `jobs` — only the optional
  // stats row above it differs, so the panel itself renders once.
  const renderJobsPanel = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-4 flex items-center justify-end gap-2">
        {VIEW_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setJobsView(key)}
            className={viewToggleClass(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <JobListSkeleton
          density={jobsView === "compact" ? "compact" : "comfortable"}
          count={4}
        />
      ) : jobsView === "kanban" ? (
        <KanbanBoard
          jobs={filteredJobs}
          onEdit={canEditDelete ? openEdit : undefined}
          onDelete={canEditDelete ? requestDelete : undefined}
          canEditDelete={canEditDelete}
          isMovingJobId={isMovingJobId}
          draggingJobId={draggingJobId}
        />
      ) : (
        <JobList
          jobs={filteredJobs}
          onEdit={canEditDelete ? openEdit : undefined}
          onDelete={canEditDelete ? requestDelete : undefined}
          canEditDelete={canEditDelete}
          draggingJobId={draggingJobId}
          absorbingJobId={absorbingJobId}
          density={jobsView === "compact" ? "compact" : "comfortable"}
        />
      )}
    </div>
  );

  // === JSX ==================================================================

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
        {toast ? (
          <div className="pointer-events-none fixed right-4 top-4 z-50">
            <div
              className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 shadow-lg ${
                toast.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-green-200 bg-green-50 text-green-800"
              }`}
              role="status"
              aria-live="polite"
            >
              {toast.type === "error" ? (
                <XCircle size={16} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={16} aria-hidden="true" />
              )}
              <p className="text-sm">{toast.message}</p>
              <button
                type="button"
                onClick={clearToast}
                className="ml-2 text-xs font-semibold opacity-75 transition hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <aside className="w-full border-b border-slate-200 bg-white shadow-card lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Sparkles size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                Smart Job Tracker
              </p>
              <p className="truncate text-xs text-text-hint">
                Track progress end-to-end
              </p>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 lg:block lg:pb-0">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveNav(key)}
                className={navButtonClass(key)}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-2 px-3 pb-6 lg:mt-6">
            <TrashDropZone
              activeNav={activeNav}
              setActiveNav={setActiveNav}
              isTrashHover={isTrashHover}
              isTrashArmed={isTrashArmed}
              trashDropPulse={trashDropPulse}
              dropFeedback={dropFeedback}
              draggingJob={draggingJob}
            />
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-text-body transition duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-95"
            >
              Logout
            </button>
            {!isMock ? (
              <div className="mt-3 px-3 text-xs text-text-hint">
                Connected to your DB
              </div>
            ) : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
            <div className="flex items-center justify-between gap-4 p-4 sm:gap-6 sm:p-6">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-text-primary">
                  {PAGE_TITLES[activeNav] ?? "Dashboard"}
                </h1>
                <p className="truncate text-sm text-text-hint">{user?.email}</p>
              </div>

              <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
                <div className="relative hidden w-full max-w-md sm:block">
                  <Search
                    size={16}
                    aria-hidden="true"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-hint"
                  />
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white pl-11 pr-3 py-2 text-sm text-text-primary outline-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    placeholder="Search jobs by company, role, status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={openAddJobDialog}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-blue-700 hover:shadow active:scale-95"
                >
                  Add Job
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
                    {avatarInitials}
                  </div>
                  <button
                    type="button"
                    className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-text-body transition duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-95 sm:inline-flex"
                    onClick={clearError}
                    aria-label="Clear errors"
                  >
                    <Settings size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-8">
            {error ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {activeNav === "analytics" ? (
              <AnalyticsView onAddJob={openAddJobDialog} />
            ) : null}

            {activeNav === "dashboard" || activeNav === "jobs" ? (
              <div className="space-y-4">
                {activeNav === "dashboard" ? (
                  isLoading ? (
                    <StatsSkeleton />
                  ) : (
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {STAGES.map(({ key, label, icon: Icon, classes }) => (
                        <StatusSummaryDropZone
                          key={key}
                          stageKey={key}
                          draggingJob={draggingJob}
                          hoverSummaryKey={hoverSummaryKey}
                          setSummaryZoneEl={setSummaryZoneEl}
                          className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
                        >
                          <div className="flex items-center justify-between">
                            <p className={`text-sm ${classes.label}`}>{label}</p>
                            <Icon
                              size={18}
                              aria-hidden="true"
                              className={classes.icon}
                            />
                          </div>
                          <p className={`mt-1 text-2xl font-bold ${classes.number}`}>
                            <CountUp value={totals[key]} />
                          </p>
                        </StatusSummaryDropZone>
                      ))}
                    </section>
                  )
                ) : null}

                {renderJobsPanel()}
              </div>
            ) : null}

            {activeNav === "deleted" ? <DeletedItemsView /> : null}
          </main>
        </div>

        <DragOverlay>
          {draggingJob ? (
            <motion.div
              className="pointer-events-none w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
              initial={{ opacity: 0.9, scale: 0.98, rotate: -1.5 }}
              animate={{ opacity: 0.95, scale: 1.06, rotate: -1.5 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 30,
                mass: 0.3,
              }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {draggingJob.company}
                </p>
                <p className="truncate text-xs text-text-hint">
                  {draggingJob.role}
                </p>
              </div>
              {draggingJob.appliedDate ? (
                <p className="mt-1 text-xs text-text-hint">
                  Applied {new Date(draggingJob.appliedDate).toLocaleDateString()}
                </p>
              ) : null}
            </motion.div>
          ) : null}
        </DragOverlay>
      </div>

      {/* === Modals (portal-mounted via <Dialog>) === */}

      <Dialog
        open={Boolean(pendingDeleteJob)}
        onClose={closeDeleteModal}
        title="Delete job?"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={closeDeleteModal}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-text-body transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Delete
            </button>
          </>
        }
      >
        {pendingDeleteJob ? (
          <>
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-text-primary">
                {pendingDeleteJob.company}
              </span>
              {" — "}
              <span className="font-semibold text-text-primary">
                {pendingDeleteJob.role}
              </span>
            </p>
            <p className="mt-1 text-sm text-text-hint">
              This action cannot be undone.
            </p>
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(editingJob)}
        onClose={closeEdit}
        title="Edit job"
        description="Update details and save changes."
        size="lg"
      >
        {editingJob ? (
          <JobForm
            initialJob={editingJob}
            onSubmit={handleEditJobSubmit}
            isSubmitting={isSavingEdit}
            submitLabel="Save changes"
            submittingLabel="Saving..."
            hideHeading
          />
        ) : null}
      </Dialog>

      <Dialog
        open={isAddJobOpen}
        onClose={() => setIsAddJobOpen(false)}
        title="Add Job Application"
        description="Capture each application as it moves through your pipeline."
      >
        <JobForm
          onSubmit={handleAddJobSubmit}
          isSubmitting={isSubmitting}
          hideHeading
        />
      </Dialog>
    </DndContext>
  );
}

export default DashboardPage;

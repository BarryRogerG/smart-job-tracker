import { Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useJobDragHandle } from "../hooks/useJobDragHandle.js";
import { listStaggerDelayMs } from "../utils/listAnimation.js";
import {
  CARD_ABSORB_TWEEN,
  CARD_DRAG_SPRING,
  CARD_HOVER,
  CARD_TAP,
  CARD_TWEEN,
} from "../utils/cardMotion.js";

// Discrete animation states for the comfortable list card. Defined at module
// scope so Framer doesn't reallocate the target object on every render.
const cardVariants = {
  idle: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    y: 0,
    boxShadow:
      "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
  },
  dragging: {
    scale: 1.07,
    rotate: -1.5,
    opacity: 0.86,
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.25)",
  },
  absorbing: {
    scale: 0.82,
    rotate: 0,
    opacity: 0,
    y: -36,
    boxShadow: "0 12px 32px rgba(37, 99, 235, 0.2)",
  },
};
import CompactJobCard from "./CompactJobCard.jsx";
import { statusClass, statusLabel } from "../utils/jobStatus.js";

function DraggableJobCard({
  job,
  index,
  onEdit,
  onDelete,
  draggingJobId,
  absorbingJobId,
  isSelected,
  onSelect,
  canEditDelete,
}) {
  const canEdit = typeof onEdit === "function";
  const canDelete = typeof onDelete === "function";
  const isAbsorbing =
    absorbingJobId != null && String(absorbingJobId) === String(job.id);
  const { attributes, listeners, setNodeRef, isDragging, transformStyle } =
    useJobDragHandle(job, { disabled: !canEditDelete });

  // True when this specific card is the one being dragged. dnd-kit fires
  // `isDragging` for the active card; `draggingJobId` is the parent's source
  // of truth for which id is in flight.
  const isDragSelfActive =
    isDragging || String(draggingJobId) === String(job.id);
  // Suppress hover/tap feedback whenever the card is mid-interaction so the
  // pointer release doesn't compete with the drag/absorb animation.
  const isInteractionLocked = isAbsorbing || isDragSelfActive;

  const style = {
    animationDelay: `${listStaggerDelayMs(index, "comfortable")}ms`,
    transform: transformStyle,
  };

  const formattedDate = job.appliedDate
    ? new Date(job.appliedDate).toLocaleDateString()
    : "N/A";

  return (
    <motion.article
      ref={setNodeRef}
      data-job-card
      style={style}
      title={job.notes || undefined}
      className={`animate-fade-in-up rounded-xl border bg-white px-4 py-3 transition-colors duration-200 ${
        isSelected ? "border-black" : "border-slate-200"
      }`}
      onClick={() => onSelect?.(job.id)}
      variants={cardVariants}
      initial="idle"
      animate={
        isAbsorbing ? "absorbing" : isDragSelfActive ? "dragging" : "idle"
      }
      whileHover={isInteractionLocked ? undefined : CARD_HOVER}
      whileTap={isInteractionLocked ? undefined : CARD_TAP}
      transition={
        isAbsorbing
          ? CARD_ABSORB_TWEEN
          : isDragSelfActive
            ? CARD_DRAG_SPRING
            : CARD_TWEEN
      }
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-4">
        {/* Left: Company / Role */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold tracking-tight text-text-primary">
            {job.company}
          </h3>
          <p className="truncate text-sm text-text-muted">{job.role}</p>
        </div>

        {/* Right: Status badge + applied date + actions */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden flex-col items-end gap-1 sm:flex">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(
                job.status
              )}`}
            >
              {statusLabel(job.status)}
            </span>
            <span className="text-xs tabular-nums text-text-hint">
              {formattedDate}
            </span>
          </div>

          {job.link ? (
            <a
              className="hidden text-xs font-medium text-blue-600 hover:underline sm:inline"
              href={job.link}
              target="_blank"
              rel="noreferrer"
              onPointerDown={(event) => event.stopPropagation()}
            >
              Link
            </a>
          ) : null}

          <div className="flex items-center gap-1">
            <button
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition duration-200 active:scale-95 disabled:active:scale-100 ${
                canEdit
                  ? "text-text-muted hover:bg-slate-100 hover:text-text-primary"
                  : "cursor-not-allowed text-gray-300"
              }`}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onEdit?.(job)}
              aria-label="Edit job"
              disabled={!canEdit}
            >
              <Pencil size={15} aria-hidden="true" />
            </button>
            <button
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition duration-200 active:scale-95 disabled:active:scale-100 ${
                canDelete
                  ? "text-text-muted hover:bg-red-50 hover:text-red-700"
                  : "cursor-not-allowed text-red-200"
              }`}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onDelete?.(job)}
              aria-label="Delete job"
              disabled={!canDelete}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function JobList({
  jobs,
  onEdit,
  onDelete,
  draggingJobId,
  absorbingJobId,
  canEditDelete = true,
  density = "comfortable",
}) {
  const isCompact = density === "compact";
  const Card = isCompact ? CompactJobCard : DraggableJobCard;
  const [selectedJobId, setSelectedJobId] = useState(null);
  const listRef = useRef(null);
  const canEdit = typeof onEdit === "function";
  const canDelete = typeof onDelete === "function";
  const isEmpty = jobs.length === 0;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!selectedJobId) return;
      const root = listRef.current;
      if (!root) return;
      if (root.contains(event.target) && event.target.closest("[data-job-card]")) {
        return;
      }
      setSelectedJobId(null);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [selectedJobId]);

  if (isEmpty) {
    return (
      <section className="p-6 text-center">
        <p className="text-lg font-semibold text-gray-800">No jobs yet</p>
        <p className="mt-2 text-sm text-text-hint">
          Start by adding your first application to build your pipeline.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Job Applications</h2>
          <p className="text-sm text-text-hint">
            Track applications, interviews, and offers in one place.
          </p>
        </div>
        <p className="text-sm text-text-hint">{jobs.length} total</p>
      </header>

      <div ref={listRef} className={isCompact ? "space-y-1.5" : "space-y-4"}>
        {jobs.map((job, index) => (
          <Card
            key={job.id}
            job={job}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
            canEditDelete={canEditDelete}
            draggingJobId={draggingJobId}
            absorbingJobId={absorbingJobId}
            isSelected={String(selectedJobId) === String(job.id)}
            onSelect={setSelectedJobId}
          />
        ))}
      </div>
    </section>
  );
}

export default JobList;

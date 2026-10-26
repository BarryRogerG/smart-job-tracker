import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { useJobDragHandle } from "../hooks/useJobDragHandle.js";
import { listStaggerDelayMs } from "../utils/listAnimation.js";
import {
  CARD_ABSORB_TWEEN,
  CARD_DRAG_SPRING,
  CARD_HOVER,
  CARD_TAP,
  CARD_TWEEN,
} from "../utils/cardMotion.js";
import {
  statusCardTone,
  statusClass,
  statusLabel,
} from "../utils/jobStatus.js";

// Discrete animation states for the dense compact card. Slimmer scales than
// the comfortable variant since the row is shorter and motion reads bigger.
// `dragging` is a placeholder in the list; DragOverlay owns the lift.
const cardVariants = {
  idle: {
    scale: 1,
    opacity: 1,
    y: 0,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  },
  dragging: {
    scale: 1,
    opacity: 0.4,
    y: 0,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  },
  absorbing: {
    scale: 0.92,
    opacity: 0,
    y: -16,
    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.18)",
  },
};

/**
 * Dense single-row job card used by the "Compact" list density.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Acme Inc.                  [Applied]   4/22/2026   ✏️  🗑️    │
 *   │ Senior Engineer                                              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 *  - Left column: company (sm/semibold) + role (xs/uppercase label).
 *  - Right column: status badge, applied date, optional link, edit/delete.
 *  - Same drag-and-drop wiring as DraggableJobCard so the trash zone and
 *    status drop zones in the dashboard keep working in compact mode.
 */
function CompactJobCard({
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
  const reducedMotion = useReducedMotion();
  const canEdit = typeof onEdit === "function";
  const canDelete = typeof onDelete === "function";
  const isAbsorbing =
    absorbingJobId != null && String(absorbingJobId) === String(job.id);
  const isThisDragging =
    draggingJobId != null && String(draggingJobId) === String(job.id);

  const { attributes, listeners, setNodeRef, isDragging } = useJobDragHandle(
    job,
    { disabled: !canEditDelete },
  );

  const isDragSelfActive = isDragging || isThisDragging;
  const isInteractionLocked = isAbsorbing || isDragSelfActive;

  const style = reducedMotion
    ? undefined
    : { animationDelay: `${listStaggerDelayMs(index, "compact")}ms` };

  const cardTransition = reducedMotion
    ? { duration: 0 }
    : isAbsorbing
      ? CARD_ABSORB_TWEEN
      : isDragSelfActive
        ? CARD_DRAG_SPRING
        : CARD_TWEEN;

  const stopBubble = (event) => event.stopPropagation();

  return (
    <Motion.article
      ref={setNodeRef}
      data-job-card
      style={style}
      onClick={() => onSelect?.(job.id)}
      className={`${reducedMotion ? "" : "animate-fade-in-up "}flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition duration-200 hover:brightness-95 ${
        isSelected ? "border-gray-900 bg-white" : statusCardTone(job.status)
      }`}
      variants={cardVariants}
      initial="idle"
      animate={
        isAbsorbing
          ? "absorbing"
          : reducedMotion
            ? "idle"
            : isDragSelfActive
              ? "dragging"
              : "idle"
      }
      whileHover={
        reducedMotion || isInteractionLocked ? undefined : CARD_HOVER
      }
      whileTap={reducedMotion || isInteractionLocked ? undefined : CARD_TAP}
      transition={cardTransition}
      {...listeners}
      {...attributes}
    >
      {/* Left: Company / Role */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-text-primary">
          {job.company}
        </h3>
        <p className="truncate text-[11px] uppercase tracking-wide text-text-hint">
          {job.role}
        </p>
      </div>

      {/* Right: Status badge, date, actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Keyed on job.status so the badge re-runs its entrance animation
            whenever the status changes — gives the change a visual confirm. */}
        <Motion.span
          key={job.status}
          initial={
            reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }
          }
          animate={{ opacity: 1, scale: 1 }}
          transition={reducedMotion ? { duration: 0 } : CARD_TWEEN}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(
            job.status
          )}`}
        >
          {statusLabel(job.status)}
        </Motion.span>

        <span className="hidden text-[11px] tabular-nums text-text-hint sm:inline">
          {job.appliedDate
            ? new Date(job.appliedDate).toLocaleDateString()
            : "—"}
        </span>

        {job.link ? (
          <a
            href={job.link}
            target="_blank"
            rel="noreferrer"
            onPointerDown={stopBubble}
            onClick={stopBubble}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-hint transition hover:bg-gray-100 hover:text-blue-700"
            aria-label="Open job link"
          >
            <ExternalLink size={13} />
          </a>
        ) : null}

        <button
          type="button"
          onPointerDown={stopBubble}
          onClick={(event) => {
            stopBubble(event);
            onEdit?.(job);
          }}
          disabled={!canEdit}
          aria-label="Edit job"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-md transition ${
            canEdit
              ? "text-text-hint hover:bg-gray-100 hover:text-text-primary"
              : "cursor-not-allowed text-gray-300"
          }`}
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onPointerDown={stopBubble}
          onClick={(event) => {
            stopBubble(event);
            onDelete?.(job);
          }}
          disabled={!canDelete}
          aria-label="Delete job"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-md transition ${
            canDelete
              ? "text-text-hint hover:bg-red-50 hover:text-red-700"
              : "cursor-not-allowed text-red-200"
          }`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </Motion.article>
  );
}

export default CompactJobCard;

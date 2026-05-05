import { Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { useJobDragHandle } from "../hooks/useJobDragHandle.js";
import {
  CARD_DRAG_SPRING,
  CARD_TAP,
  CARD_TWEEN,
  KANBAN_CARD_HOVER,
} from "../utils/cardMotion.js";
import { STAGES } from "../utils/jobStages.js";
import { normalizeStatus } from "../utils/jobStats.js";
import { statusLabel } from "../utils/jobStatus.js";

// Discrete animation states for the Kanban card. There's no "absorbing"
// state because Kanban cards drop onto columns, not into a stat tile.
const cardVariants = {
  idle: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
  },
  dragging: {
    scale: 1.08,
    rotate: -1,
    opacity: 0.86,
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.25)",
  },
};

function buildColumns(jobs) {
  return STAGES.reduce((acc, stage) => {
    acc[stage.key] = [];
    return acc;
  }, {});
}

function KanbanCard({ job, onEdit, onDelete, canEditDelete, isMovingJobId, draggingJobId }) {
  const { attributes, listeners, setNodeRef, isDragging, transformStyle } =
    useJobDragHandle(job, { disabled: !canEditDelete });

  const isDragSelfActive =
    isDragging || String(draggingJobId) === String(job.id);

  return (
    <motion.article
      ref={setNodeRef}
      style={{ transform: transformStyle }}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-card ${
        canEditDelete ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      } ${isMovingJobId === job.id ? "ring-2 ring-blue-200" : ""}`}
      variants={cardVariants}
      initial="idle"
      animate={isDragSelfActive ? "dragging" : "idle"}
      whileHover={isDragSelfActive ? undefined : KANBAN_CARD_HOVER}
      whileTap={isDragSelfActive ? undefined : CARD_TAP}
      transition={isDragSelfActive ? CARD_DRAG_SPRING : CARD_TWEEN}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-text-primary">{job.company}</h4>
          <p className="truncate text-xs text-text-hint">{job.role}</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-text-body">
          {statusLabel(job.status)}
        </span>
      </div>

      {job.appliedDate ? (
        <p className="mt-2 text-xs text-text-hint">
          Applied {new Date(job.appliedDate).toLocaleDateString()}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onEdit?.(job)}
          disabled={!canEditDelete}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition duration-200 ${
            canEditDelete
              ? "border-gray-200 text-text-muted hover:bg-gray-50"
              : "cursor-not-allowed border-gray-100 text-gray-300"
          }`}
        >
          <Pencil size={13} />
          Edit
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDelete?.(job)}
          disabled={!canEditDelete}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition duration-200 ${
            canEditDelete
              ? "border-gray-200 text-text-muted hover:bg-red-50 hover:text-red-700"
              : "cursor-not-allowed border-gray-100 text-gray-300"
          }`}
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </motion.article>
  );
}

function DroppableColumn({ stage, count, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${stage.key}`,
    data: {
      type: "stage",
      status: stage.key,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-3 shadow-sm transition-all duration-200 ${stage.classes.kanbanTone} ${
        isOver ? "ring-2 ring-blue-300 ring-offset-2" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{stage.label}</h3>
        <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold">
          {count}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function KanbanBoard({
  jobs,
  onEdit,
  onDelete,
  canEditDelete,
  isMovingJobId,
  draggingJobId,
}) {
  const columns = buildColumns(jobs);
  jobs.forEach((job) => {
    const key = normalizeStatus(job?.status);
    if (columns[key]) {
      columns[key].push(job);
    } else {
      columns.applied.push({ ...job, status: "applied" });
    }
  });

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Job Pipeline</h2>
          <p className="text-sm text-text-hint">
            Drag cards across stages to move your ATS funnel.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage) => (
          <DroppableColumn
            key={stage.key}
            stage={stage}
            count={columns[stage.key]?.length || 0}
          >
            {columns[stage.key]?.map((job) => (
              <KanbanCard
                key={job.id}
                job={job}
                onEdit={onEdit}
                onDelete={onDelete}
                canEditDelete={canEditDelete}
                isMovingJobId={isMovingJobId}
                draggingJobId={draggingJobId}
              />
            ))}

            {columns[stage.key]?.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/40 px-3 py-6 text-center transition-colors duration-200 hover:border-slate-400 hover:bg-white/70">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-text-hint"
                >
                  <Plus size={16} />
                </span>
                <p className="text-xs font-medium text-text-hint">
                  Drop a job here
                </p>
              </div>
            ) : null}
          </DroppableColumn>
        ))}
      </div>
    </section>
  );
}

export default KanbanBoard;

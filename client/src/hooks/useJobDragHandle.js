import { useDraggable } from "@dnd-kit/core";

/**
 * Wires up dnd-kit drag behavior for a job card. All three card variants
 * (CompactJobCard, DraggableJobCard in JobList, KanbanCard in KanbanBoard)
 * register with identical id/data/disabled shapes, so they consume this
 * hook identically.
 *
 * The source card stays in place. DragOverlay in DashboardPage is the
 * visual that follows the pointer, so this hook does not apply a
 * translate transform (that would fight Framer Motion and duplicate
 * the overlay).
 *
 * Returns:
 *   - setNodeRef:     attach to the draggable element's ref
 *   - attributes:     spread onto the draggable element
 *   - listeners:      spread onto the draggable element
 *   - isDragging:     true while the card is being dragged
 */
export function useJobDragHandle(job, { disabled = false } = {}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    data: { type: "job", job },
    disabled,
  });

  return {
    setNodeRef,
    attributes,
    listeners,
    isDragging,
  };
}

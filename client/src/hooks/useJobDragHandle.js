import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

/**
 * Wires up dnd-kit drag behavior for a job card. All three card variants
 * (CompactJobCard, DraggableJobCard in JobList, KanbanCard in KanbanBoard)
 * register with identical id/data/disabled shapes, so they consume this
 * hook identically.
 *
 * Returns:
 *   - setNodeRef:     attach to the draggable element's ref
 *   - attributes:     spread onto the draggable element
 *   - listeners:      spread onto the draggable element
 *   - isDragging:     true while the card is being dragged
 *   - transformStyle: ready-to-use CSS string for the `transform` style key
 *                     (or undefined when no transform is active)
 */
export function useJobDragHandle(job, { disabled = false } = {}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: job.id,
      data: { type: "job", job },
      disabled,
    });

  return {
    setNodeRef,
    attributes,
    listeners,
    isDragging,
    transformStyle: transform ? CSS.Translate.toString(transform) : undefined,
  };
}

import { useDroppable } from "@dnd-kit/core";
import { SUMMARY_DROP_PREFIX } from "../utils/jobStages.js";
import { normalizeStatus } from "../utils/jobStats.js";

/**
 * A wrapper around a stat card that registers itself as a dnd-kit drop target
 * for one stage. It only accepts cards whose status already matches its
 * `stageKey` (drop is meaningful for the absorption animation, not a status
 * change); other cards see a dimmed/red-ring "invalid" treatment instead.
 *
 * Props:
 *  - stageKey:           "applied" | "interviewing" | "offer" | "rejected"
 *  - draggingJob:        currently dragging job, or null
 *  - hoverSummaryKey:    which summary zone the pointer is currently over
 *                        (driven by the page's pointermove listener); used to
 *                        flag invalid hovers regardless of dnd-kit's own
 *                        collision result
 *  - setSummaryZoneEl:   (key, node) => void — lets the page collect DOM refs
 *                        for its custom hit-test against pointer coords
 *  - className:          base styling for the card surface
 *  - children:           card content (label + count)
 */
export default function StatusSummaryDropZone({
  stageKey,
  draggingJob,
  hoverSummaryKey,
  setSummaryZoneEl,
  className,
  children,
}) {
  const jobStatusKey = draggingJob ? normalizeStatus(draggingJob.status) : null;
  const isWrongSummaryTarget = Boolean(
    draggingJob && (jobStatusKey == null || jobStatusKey !== stageKey)
  );

  const { setNodeRef, isOver } = useDroppable({
    id: `${SUMMARY_DROP_PREFIX}${stageKey}`,
    data: {
      type: "summary-status",
      status: stageKey,
    },
    disabled: isWrongSummaryTarget,
  });

  const setRefs = (node) => {
    setNodeRef(node);
    setSummaryZoneEl?.(stageKey, node);
  };

  const validDropHighlight = Boolean(draggingJob && !isWrongSummaryTarget && isOver);
  const dimmed = Boolean(draggingJob && isWrongSummaryTarget);
  const invalidHover = Boolean(
    draggingJob &&
      jobStatusKey != null &&
      jobStatusKey !== stageKey &&
      hoverSummaryKey === stageKey
  );

  return (
    <div
      ref={setRefs}
      data-summary-drop={stageKey}
      className={`${className} transition-all duration-200 ${
        validDropHighlight ? "ring-2 ring-blue-500 ring-offset-2" : ""
      } ${dimmed ? "opacity-45" : ""} ${
        invalidHover ? "ring-2 ring-red-300 ring-offset-1" : ""
      }`}
    >
      {children}
    </div>
  );
}

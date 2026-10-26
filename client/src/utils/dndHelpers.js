import { pointerWithin, rectIntersection } from "@dnd-kit/core";
import {
  SUMMARY_DROP_PREFIX,
  SUMMARY_STAGE_ORDER,
} from "./jobStages.js";
import { normalizeStatus } from "./jobStats.js";

export { SUMMARY_DROP_PREFIX };

/**
 * Closest-center hit test among the four summary stat rectangles. Used as a
 * fallback when dnd-kit collision alone cannot resolve summary targets.
 */
export function hitSummaryZoneFromRects(clientX, clientY, zonesRef) {
  const zones = zonesRef.current;
  let bestKey = null;
  let bestDist = Infinity;

  for (const key of SUMMARY_STAGE_ORDER) {
    const el = zones[key];
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const inside =
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom;
    if (!inside) continue;

    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    const dist = (clientX - cx) ** 2 + (clientY - cy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = key;
    }
  }

  return bestKey;
}

/**
 * Trash wins when the dragged card overlaps it; summary zones only register
 * when they match the job's current status (filing); otherwise pointer/rect
 * collision handles Kanban columns.
 */
export function buildCollisionDetection(getSummaryZonesRef) {
  return function collisionDetectionStrategy(args) {
    const rectHits = rectIntersection(args);
    const trashHit = rectHits.find((entry) => entry.id === "trash");
    if (trashHit) {
      return [trashHit];
    }

    const job = args.active?.data?.current?.job;
    const jobStatusKey = job ? normalizeStatus(job.status) : null;
    const point = args.pointerCoordinates;
    const activeType = args.active?.data?.current?.type;

    if (
      activeType === "job" &&
      jobStatusKey &&
      point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    ) {
      const zonesRef = getSummaryZonesRef?.();
      const domKey =
        zonesRef && typeof zonesRef === "object"
          ? hitSummaryZoneFromRects(point.x, point.y, zonesRef)
          : null;

      if (domKey && domKey === jobStatusKey) {
        const summaryId = `${SUMMARY_DROP_PREFIX}${domKey}`;
        const exists = [...args.droppableContainers].some(
          (c) => String(c.id) === summaryId
        );
        if (exists) {
          return [{ id: summaryId }];
        }
      }
    }

    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) {
      return pointerHits;
    }

    return rectHits;
  };
}

import {
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { SUMMARY_DROP_PREFIX } from "../utils/jobStages.js";
import { normalizeStatus } from "../utils/jobStats.js";
import { buildCollisionDetection } from "../utils/dndHelpers.js";

const TRASH_ARM_MS = 500;
const ABSORB_MS = 420;

/**
 * Central drag-and-drop orchestration for the dashboard: Kanban stage moves,
 * summary "filing" drops, and armed trash deletes. Status changes fire
 * optimistic `updateJob` calls; failures roll back via JobContext.
 */
export function useDashboardDragDrop({
  canEditDelete,
  updateJob,
  deleteJob,
}) {
  const [draggingJob, setDraggingJob] = useState(null);
  const [hoverSummaryKey, setHoverSummaryKey] = useState(null);
  const [absorbingJobId, setAbsorbingJobId] = useState(null);
  const [isMovingJobId, setIsMovingJobId] = useState(null);
  const [isTrashHover, setIsTrashHover] = useState(false);
  const [isTrashArmed, setIsTrashArmed] = useState(false);
  const [trashDropPulse, setTrashDropPulse] = useState(false);
  const [dropFeedback, setDropFeedback] = useState("");

  const summaryZonesRef = useRef({});

  const setSummaryZoneEl = (key, node) => {
    summaryZonesRef.current[key] = node;
  };

  const trashArmTimerRef = useRef(null);
  const absorbTimerRef = useRef(null);
  const dropFeedbackTimerRef = useRef(null);

  const draggingJobId = draggingJob?.id ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const clearTrashArmTimer = () => {
    if (trashArmTimerRef.current != null) {
      window.clearTimeout(trashArmTimerRef.current);
      trashArmTimerRef.current = null;
    }
  };

  const startTrashArmTimer = useCallback(() => {
    if (trashArmTimerRef.current != null || !canEditDelete) return;
    trashArmTimerRef.current = window.setTimeout(() => {
      setIsTrashArmed(true);
      trashArmTimerRef.current = null;
    }, TRASH_ARM_MS);
  }, [canEditDelete]);

  useEffect(
    () => () => {
      if (trashArmTimerRef.current != null) {
        window.clearTimeout(trashArmTimerRef.current);
      }
      if (absorbTimerRef.current != null) {
        window.clearTimeout(absorbTimerRef.current);
      }
      if (dropFeedbackTimerRef.current != null) {
        window.clearTimeout(dropFeedbackTimerRef.current);
      }
    },
    []
  );

  const resetDragUi = useCallback(() => {
    setDraggingJob(null);
    setHoverSummaryKey(null);
    setIsTrashHover(false);
    setIsTrashArmed(false);
    clearTrashArmTimer();
  }, []);

  const scheduleAbsorbClear = useCallback((jobId) => {
    setAbsorbingJobId(jobId);
    if (absorbTimerRef.current != null) {
      window.clearTimeout(absorbTimerRef.current);
    }
    absorbTimerRef.current = window.setTimeout(() => {
      setAbsorbingJobId(null);
      absorbTimerRef.current = null;
    }, ABSORB_MS);
  }, []);

  const showTrashFeedback = useCallback((message) => {
    setDropFeedback(message);
    if (dropFeedbackTimerRef.current != null) {
      window.clearTimeout(dropFeedbackTimerRef.current);
    }
    dropFeedbackTimerRef.current = window.setTimeout(() => {
      setDropFeedback("");
      dropFeedbackTimerRef.current = null;
    }, 2200);
  }, []);

  const handleMoveJob = useCallback(
    (job, nextStatus) => {
      if (!canEditDelete || !job?.id) return;
      const normalizedCurrent = normalizeStatus(job.status);
      const normalizedNext = normalizeStatus(nextStatus);
      if (!normalizedNext || normalizedCurrent === normalizedNext) return;

      setIsMovingJobId(job.id);
      updateJob(job.id, { status: normalizedNext })
        .catch(() => {
          /* JobContext rolls back + toast on failure */
        })
        .finally(() => {
          setIsMovingJobId((current) =>
            current === job.id ? null : current
          );
        });
    },
    [canEditDelete, updateJob]
  );

  const handleDragStart = useCallback(
    (event) => {
      if (!canEditDelete) return;
      const job = event.active?.data?.current?.job;
      if (!job) return;

      setDraggingJob(job);
    },
    [canEditDelete]
  );

  const handleDragOver = useCallback(
    (event) => {
      const overId = event.over ? String(event.over.id) : "";
      const trashActive = overId === "trash";

      if (trashActive) {
        if (!isTrashHover) {
          setIsTrashHover(true);
          startTrashArmTimer();
        }
      } else if (isTrashHover) {
        setIsTrashHover(false);
        setIsTrashArmed(false);
        clearTrashArmTimer();
      }

      if (overId.startsWith(SUMMARY_DROP_PREFIX)) {
        setHoverSummaryKey(overId.slice(SUMMARY_DROP_PREFIX.length));
      } else {
        setHoverSummaryKey(null);
      }
    },
    [isTrashHover, startTrashArmTimer]
  );

  const handleDragCancel = useCallback(() => {
    resetDragUi();
  }, [resetDragUi]);

  const handleDragEnd = useCallback(
    (event) => {
      const job = event.active?.data?.current?.job;
      const over = event.over;

      if (job && over) {
        const overId = String(over.id);
        const overType = over.data?.current?.type;

        if (overId === "trash" && isTrashArmed) {
          setTrashDropPulse(true);
          window.setTimeout(() => setTrashDropPulse(false), 400);
          deleteJob(job)
            .then(() => {
              showTrashFeedback("Moved to deleted items");
            })
            .catch(() => {});
        } else if (overType === "stage") {
          handleMoveJob(job, over.data.current.status);
        } else if (overType === "summary-status") {
          const targetStatus = over.data.current.status;
          const jobStatus = normalizeStatus(job.status);
          if (jobStatus === normalizeStatus(targetStatus)) {
            scheduleAbsorbClear(job.id);
          }
        }
      }

      resetDragUi();
    },
    [
      deleteJob,
      handleMoveJob,
      isTrashArmed,
      resetDragUi,
      scheduleAbsorbClear,
      showTrashFeedback,
    ]
  );

  const dndContextProps = {
    sensors,
    collisionDetection: buildCollisionDetection(() => summaryZonesRef),
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragCancel,
  };

  const dragOverlayProps = {
    draggingJob,
  };

  const listDragProps = {
    draggingJobId,
    absorbingJobId,
    canEditDelete,
  };

  const kanbanDragProps = {
    draggingJobId,
    isMovingJobId,
    canEditDelete,
  };

  const summaryDropProps = {
    draggingJob,
    hoverSummaryKey,
    setSummaryZoneEl,
  };

  const trashDropProps = {
    isTrashHover,
    isTrashArmed,
    trashDropPulse,
    dropFeedback,
    draggingJob,
  };

  return {
    dndContextProps,
    dragOverlayProps,
    listDragProps,
    kanbanDragProps,
    summaryDropProps,
    trashDropProps,
    DragOverlay,
  };
}

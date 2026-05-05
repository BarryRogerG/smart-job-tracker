import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";

import { MOTION_FAST } from "../utils/motion.js";

/**
 * Sidebar trash target. Visually morphs through three states:
 *   1. idle           — neutral border + label
 *   2. hovering       — pulses softly, label flips to "Drop to delete"
 *   3. armed (>500ms) — scales up + red ring + label flips to "Release to delete"
 *
 * The 500ms arming timer is owned by the parent page and passed in as
 * `isTrashArmed`, so brief fly-overs never falsely signal "ready to delete".
 *
 * `dropFeedback` is a transient toast that animates in below the button after
 * a successful trash drop and fades out on its own.
 */
export default function TrashDropZone({
  activeNav,
  setActiveNav,
  isTrashHover,
  isTrashArmed,
  trashDropPulse,
  dropFeedback,
  draggingJob,
}) {
  const { setNodeRef } = useDroppable({
    id: "trash",
    data: {
      type: "trash",
    },
  });

  // Armed wins so the icon stays scaled up as a "ready to delete" cue.
  let animateState;
  let transition;
  if (isTrashArmed) {
    animateState = {
      scale: 1.08,
      boxShadow: "0 0 0 10px rgba(239,68,68,0.22)",
    };
    transition = { type: "spring", stiffness: 320, damping: 20 };
  } else if (isTrashHover || trashDropPulse) {
    animateState = {
      scale: [1, 1.03, 1],
      boxShadow: [
        "0 0 0 rgba(239,68,68,0)",
        "0 0 0 6px rgba(239,68,68,0.15)",
        "0 0 0 rgba(239,68,68,0)",
      ],
    };
    transition = { duration: 0.4 };
  } else {
    animateState = { scale: 1, boxShadow: "0 0 0 rgba(239,68,68,0)" };
    transition = { duration: MOTION_FAST };
  }

  return (
    <>
      <motion.button
        ref={setNodeRef}
        type="button"
        onClick={() => setActiveNav("deleted")}
        className={`mb-3 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition duration-200 ${
          activeNav === "deleted"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-gray-200 bg-white text-text-body hover:bg-gray-50"
        } ${
          isTrashArmed
            ? "border-red-400 bg-red-100 text-red-800"
            : isTrashHover
              ? "border-red-300 bg-red-50 text-red-700"
              : ""
        } hover:shadow-sm active:scale-95`}
        animate={animateState}
        transition={transition}
      >
        <motion.span
          animate={isTrashArmed ? { scale: 1.15, rotate: -6 } : { scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="flex items-center"
        >
          <Trash2 size={16} aria-hidden="true" />
        </motion.span>
        {draggingJob
          ? isTrashArmed
            ? "Release to delete"
            : "Drop to delete"
          : "Deleted Items"}
      </motion.button>
      <AnimatePresence>
        {dropFeedback ? (
          <motion.p
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: MOTION_FAST }}
            className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700"
          >
            {dropFeedback}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </>
  );
}

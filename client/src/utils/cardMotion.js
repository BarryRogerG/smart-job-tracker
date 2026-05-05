// Shared Framer Motion presets for the three job-card variants. Centralized
// here so a tweak to the standard hover/tap feel propagates to every card.

import { MOTION_NORMAL } from "./motion.js";

// Tween used for idle/hover/tap transitions. Pulls its duration from the
// app-wide motion tokens so retuning the "normal" feel updates every card.
export const CARD_TWEEN = { duration: MOTION_NORMAL, ease: "easeOut" };

// Spring used while the card is being dragged. Preserves the natural,
// physics-driven feel of drag interactions; replacing it with a tween makes
// drag feel laggy.
export const CARD_DRAG_SPRING = {
  type: "spring",
  stiffness: 320,
  damping: 24,
};

// Slightly longer ease-out for the "absorb into stat tile" animation, which
// reads as a deliberate gesture rather than a state change. Stays inside the
// spec's range at 0.3s flat.
export const CARD_ABSORB_TWEEN = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

// Hover preset for the list-density cards (JobList + CompactJobCard). Their
// idle shadows are minimal, so a small shadow lift reads as elevation.
export const CARD_HOVER = {
  scale: 1.02,
  boxShadow:
    "0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.06)",
};

// Hover preset for Kanban cards. Their idle shadow is already prominent
// (`0 8px 20px ...`), so the shared CARD_HOVER would flatten them on hover.
// This pushes past the resting shadow to feel like a real lift.
export const KANBAN_CARD_HOVER = {
  scale: 1.02,
  boxShadow:
    "0 18px 36px rgba(15, 23, 42, 0.14), 0 6px 12px rgba(15, 23, 42, 0.1)",
};

export const CARD_TAP = { scale: 0.98 };

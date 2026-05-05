// App-wide animation duration tokens (in seconds, sized for Framer Motion).
//
//   - MOTION_FAST   ~0.18s  small overlays, modals, toasts
//   - MOTION_NORMAL ~0.25s  standard content transitions, cards, hover/tap
//
// Off-bucket durations (ceremonial pulses, infinite loops, deliberately
// slower entrances) intentionally stay inline at their call sites — this is
// a token table for the common tiers, not a registry of every duration in
// the app.
export const MOTION_FAST = 0.18;
export const MOTION_NORMAL = 0.25;

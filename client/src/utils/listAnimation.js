// Per-density stagger timings used by the list-style job cards. Compact rows
// are dense and short, so they enter quickly; comfortable rows have more
// visual weight and stagger ~2x slower for breathing room. Kanban cards
// don't stagger at all and don't use this module.
export const LIST_STAGGER = {
  compact: { step: 35, max: 200 },
  comfortable: { step: 70, max: 350 },
};

/**
 * Returns the `animationDelay` value (in ms) for the Nth card in a list at
 * the given density. Caps at `max` so the bottom of a long list doesn't
 * appear seconds after the top.
 */
export function listStaggerDelayMs(index, density = "comfortable") {
  const { step, max } = LIST_STAGGER[density] ?? LIST_STAGGER.comfortable;
  return Math.min(index * step, max);
}

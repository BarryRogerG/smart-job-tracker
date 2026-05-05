import { useEffect, useState } from "react";

/**
 * Animates a number from 0 up to `value` over ~350ms using rAF. Re-runs
 * whenever `value` changes. Returns the integer mid-animation.
 */
export default function CountUp({ value, duration = 350 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(target * progress));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [value, duration]);

  return <>{display}</>;
}

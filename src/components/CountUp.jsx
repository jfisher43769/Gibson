import React, { useState, useEffect } from "react";
import { reducedMotion } from "../lib/theme.js";

export function useCountUp(target, duration = 600) {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (reducedMotion() || !Number.isFinite(target)) { setV(target); return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / duration, 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setV(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function CountUp({ value, decimals = 0 }) {
  const v = useCountUp(value);
  return <>{v.toFixed(decimals)}</>;
}

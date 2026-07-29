"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

/**
 * Custom pointer for the marketing page: a small dot that tracks the mouse
 * exactly, and a ring that lags behind and swells over anything clickable.
 *
 * Both layers paint with mix-blend-mode: difference, so the cursor inverts
 * whatever is under it — readable on paper, on dark surfaces and on the
 * photography without needing a per-theme colour.
 *
 * Only mounts for fine pointers (mouse/trackpad) with motion allowed. The
 * native cursor is hidden by a class this component adds itself, so if it
 * never runs the page keeps the normal cursor.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine.matches || reduce) return;

    const d = dot.current;
    const r = ring.current;
    if (!d || !r) return;

    const scope = d.closest(".ws-landing");
    scope?.classList.add("cursor-custom");

    /* dot snaps, ring eases — the lag is what reads as a cursor rather than a sticker */
    const dx = gsap.quickTo(d, "x", { duration: 0.08, ease: "power3.out" });
    const dy = gsap.quickTo(d, "y", { duration: 0.08, ease: "power3.out" });
    const rx = gsap.quickTo(r, "x", { duration: 0.42, ease: "power3.out" });
    const ry = gsap.quickTo(r, "y", { duration: 0.42, ease: "power3.out" });

    let shown = false;
    const move = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to([d, r], { autoAlpha: 1, duration: 0.25 });
      }
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);

      /* one hit-test per move instead of listeners on every element */
      const el = e.target instanceof Element ? e.target : null;
      const hot = !!el?.closest('a, button, [role="button"], input, select, textarea, .rails');
      r.classList.toggle("hot", hot);
      d.classList.toggle("hot", hot);
    };
    const leave = () => {
      shown = false;
      gsap.to([d, r], { autoAlpha: 0, duration: 0.2 });
    };
    const down = () => r.classList.add("down");
    const up = () => r.classList.remove("down");

    addEventListener("pointermove", move, { passive: true });
    addEventListener("pointerdown", down, { passive: true });
    addEventListener("pointerup", up, { passive: true });
    document.addEventListener("pointerleave", leave);

    return () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", down);
      removeEventListener("pointerup", up);
      document.removeEventListener("pointerleave", leave);
      scope?.classList.remove("cursor-custom");
      gsap.killTweensOf([d, r]);
    };
  }, []);

  return (
    <>
      <div className="ws-cursor-ring" ref={ring} aria-hidden="true" />
      <div className="ws-cursor-dot" ref={dot} aria-hidden="true" />
    </>
  );
}

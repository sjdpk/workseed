"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RefObject, useEffect } from "react";

/**
 * All scroll- and pointer-driven motion for the home page.
 *
 * Ported 1:1 from the standalone prototype, with two changes required by React:
 *   - every tween/trigger is created inside a gsap.context() scoped to the page
 *     root, so unmounting (or a Strict-Mode double-invoke) reverts cleanly;
 *   - manual listeners and rAF loops are torn down in the cleanup.
 *
 * Interactive widgets (theme switch, drawer, FAQ) are React state — they live in
 * their own components.
 */
export function useLandingMotion(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cleanups: Array<() => void> = [];
    const on = <K extends keyof WindowEventMap>(
      target: Window | Element,
      type: K | string,
      fn: EventListenerOrEventListenerObject,
      opts?: AddEventListenerOptions
    ) => {
      target.addEventListener(type, fn, opts);
      cleanups.push(() => target.removeEventListener(type, fn, opts));
    };

    const ctx = gsap.context(() => {
      /* ---------- 1. sticky nav shade ---------- */
      const header = root.querySelector("header");
      if (header) {
        const shade = () => header.classList.toggle("stuck", scrollY > 20);
        shade();
        on(window, "scroll", shade, { passive: true });
      }

      /* ---------- 2. floating cards: pointer parallax + scroll drift ---------- */
      const plate = root.querySelector<HTMLElement>(".hero-plate");
      const floats = [...root.querySelectorAll<HTMLElement>(".float")];
      if (plate && floats.length && !reduce) {
        const wide = matchMedia("(min-width:1300px)"); /* rails only exist above this */
        let mx = 0,
          my = 0,
          cx = 0,
          cy = 0,
          sy = 0;
        on(plate, "pointermove", ((e: PointerEvent) => {
          const r = plate.getBoundingClientRect();
          mx = (e.clientX - r.left) / r.width - 0.5;
          my = (e.clientY - r.top) / r.height - 0.5;
        }) as EventListener);
        on(plate, "pointerleave", () => {
          mx = 0;
          my = 0;
        });
        on(
          window,
          "scroll",
          () => {
            sy = scrollY;
          },
          { passive: true }
        );
        const onWide = (e: MediaQueryListEvent) => {
          if (!e.matches)
            floats.forEach((f) => (f.style.transform = "")); /* strip layout owns it */
        };
        wide.addEventListener("change", onWide);
        cleanups.push(() => wide.removeEventListener("change", onWide));

        let raf = 0;
        (function loop() {
          raf = requestAnimationFrame(loop);
          if (!wide.matches) return;
          cx += (mx - cx) * 0.07;
          cy += (my - cy) * 0.07;
          floats.forEach((f) => {
            const d = parseFloat(f.dataset.depth || "1");
            f.style.transform = `translate3d(${(-cx * d * 20).toFixed(2)}px,${(
              -cy * d * 16 +
              sy * d * 0.04
            ).toFixed(2)}px,0)`;
          });
        })();
        cleanups.push(() => cancelAnimationFrame(raf));
      }

      /* ---------- 2b. hero card strip: scrolls sideways as the page scrolls ----------
         Under 1300px the rails become a horizontal strip. Rather than making people
         find and swipe it, the page's own vertical scroll drives it.

         Driven via scrollLeft, not a transform, so the strip is still a real
         scroller — swipeable and keyboard-reachable. Manual interaction wins for
         1.5s so a swipe never fights the page. */
      const rails = root.querySelector<HTMLElement>(".rails");
      if (rails && !reduce) {
        const strip = matchMedia("(max-width:1299px)");
        const cards = [...rails.querySelectorAll<HTMLElement>(".float")];
        let held = 0,
          pending = false;
        /* Only HORIZONTAL intent pauses the auto-drive — holding on any wheel
           event would freeze the strip during ordinary vertical scrolling. */
        on(
          rails,
          "wheel",
          ((e: WheelEvent) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) held = Date.now();
          }) as EventListener,
          { passive: true }
        );
        let tx = 0,
          ty = 0;
        on(
          rails,
          "touchstart",
          ((e: TouchEvent) => {
            tx = e.touches[0].clientX;
            ty = e.touches[0].clientY;
          }) as EventListener,
          { passive: true }
        );
        on(
          rails,
          "touchmove",
          ((e: TouchEvent) => {
            const dx = Math.abs(e.touches[0].clientX - tx);
            const dy = Math.abs(e.touches[0].clientY - ty);
            if (dx > dy && dx > 8) held = Date.now(); /* a real sideways swipe */
          }) as EventListener,
          { passive: true }
        );

        const paintStrip = () => {
          pending = false;
          if (!strip.matches) {
            /* wide layout: the parallax loop owns .float's transform, so only the
               opacity this function set is cleared */
            cards.forEach((c) => (c.style.opacity = ""));
            return;
          }
          const box = rails.getBoundingClientRect();
          const max = rails.scrollWidth - rails.clientWidth;

          if (max > 0 && Date.now() - held > 1500) {
            /* 0 as the strip enters from the bottom, 1 as it leaves the top,
               with a settled margin at each end */
            let p = (innerHeight - box.top) / (innerHeight + box.height);
            p = (p - 0.16) / 0.68;
            rails.scrollLeft = max * (p < 0 ? 0 : p > 1 ? 1 : p);
          }
          /* each card lifts in as it reaches the visible part of the strip */
          cards.forEach((c) => {
            const r = c.getBoundingClientRect();
            const t = (r.left - box.left) / Math.max(1, box.width);
            let a = 1 - (t - 0.58) / 0.42; /* fade in from the right */
            a = a < 0 ? 0 : a > 1 ? 1 : a;
            const b = (r.right - box.left) / Math.max(1, box.width);
            if (b < 0.18) a = Math.max(0, b / 0.18); /* and out on the left */
            c.style.opacity = a.toFixed(3);
            c.style.transform = "scale(" + (0.93 + 0.07 * a).toFixed(4) + ")";
          });
        };
        const queueStrip = () => {
          if (!pending) {
            pending = true;
            requestAnimationFrame(paintStrip);
          }
        };
        on(window, "scroll", queueStrip, { passive: true });
        on(window, "resize", queueStrip);
        on(window, "load", queueStrip);
        const onStrip = () => queueStrip();
        strip.addEventListener("change", onStrip);
        cleanups.push(() => strip.removeEventListener("change", onStrip));
        paintStrip();
      }

      /* ---------- 3. load sequence ---------- */
      if (!reduce) {
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .from("h1 .line>span", { yPercent: 112, duration: 1.15, stagger: 0.11 })
          .from(
            ".sub, .hero-cta .btn, .hero-note",
            { y: 20, opacity: 0, duration: 0.8, stagger: 0.07 },
            "-=.72"
          )
          .from(
            ".float",
            { scale: 0.86, opacity: 0, duration: 1.1, stagger: { amount: 0.5, from: "random" } },
            "-=1.05"
          )
          .from(".nav > *", { y: -14, opacity: 0, duration: 0.7, stagger: 0.06 }, 0.1);
      }

      /* ---------- 3b. rotating headline words ----------
         Both lines cycle through their own list, offset by half a beat so they
         never flip together — one line is always still while the other moves. */
      root.querySelectorAll<HTMLElement>(".rot").forEach((rot, idx) => {
        const words = (rot.dataset.words || "").split("|").filter(Boolean);
        const word = rot.querySelector("i");
        if (words.length < 2 || !word) return;

        const rule = document.createElement("i");
        rule.className = "rot-m";
        rot.appendChild(rule);
        cleanups.push(() => rule.remove());
        const fit = (t: string) => {
          rule.textContent = t;
          rot.style.width = Math.ceil(rule.getBoundingClientRect().width) + "px";
        };

        fit(words[0]);
        /* first measure happens in the fallback face, so redo it once the webfont
           lands — and again on resize, since the headline is clamp()-sized */
        if (document.fonts?.ready) {
          document.fonts.ready.then(() => fit(word.textContent || words[0]));
        }
        on(window, "resize", () => fit(word.textContent || words[0]));

        if (reduce) return;
        let i = 0,
          onScreen = true;
        const io = new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting;
        });
        io.observe(rot);
        cleanups.push(() => io.disconnect());
        const tick = () => {
          if (!onScreen || document.hidden) return; /* don't animate unseen */
          i = (i + 1) % words.length;
          const next = words[i];
          fit(next); /* CSS transitions the width */
          gsap
            .timeline()
            .to(word, { yPercent: -104, opacity: 0, duration: 0.3, ease: "power2.in" })
            .add(() => {
              word.textContent = next;
            })
            .fromTo(
              word,
              { yPercent: 104, opacity: 0 },
              { yPercent: 0, opacity: 1, duration: 0.55, ease: "expo.out" }
            );
        };
        let interval = 0;
        const start = setTimeout(
          () => {
            interval = window.setInterval(tick, 3600);
          },
          2200 + idx * 1800
        );
        cleanups.push(() => {
          clearTimeout(start);
          clearInterval(interval);
        });
      });

      /* ---------- 4. reveals ----------
         One animation per element, and only one. An element that is both
         [data-reveal] and a child of a staggered container would get two
         competing tweens and could be left invisible forever. */
      if (!reduce) {
        const STAGGER = [".grid4", ".metrics", ".gallery"];
        const staggered = new Set<Element>();
        STAGGER.forEach((sel) => {
          const parent = root.querySelector(sel);
          if (!parent) return;
          [...parent.children].forEach((c) => staggered.add(c));
          gsap.from(parent.children, {
            opacity: 0,
            y: 32,
            duration: 0.85,
            ease: "expo.out",
            stagger: 0.09,
            overwrite: "auto",
            scrollTrigger: { trigger: parent, start: "top 86%" },
          });
        });
        /* everything else reveals on its own, skipping anything already staggered */
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          if (staggered.has(el)) return;
          gsap.from(el, {
            opacity: 0,
            y: 26,
            duration: 0.9,
            ease: "expo.out",
            overwrite: "auto",
            scrollTrigger: { trigger: el, start: "top 90%" },
          });
        });
      }

      /* ---------- 5. sticky stacking modules ----------
         Driven by live getBoundingClientRect(), NOT ScrollTrigger: the cards are
         position:sticky, and a stuck element reports its pinned position at
         refresh() time, which made every trigger record a start/end far too
         early and drove the whole stack to autoAlpha:0. Reading the next card's
         rect each frame cannot go stale. */
      const mods = [...root.querySelectorAll<HTMLElement>(".mod")];
      if (mods.length && !reduce) {
        const stickTop = () => parseFloat(getComputedStyle(mods[0]).top) || 90;
        mods.forEach((m, i) => (m.style.zIndex = String(i + 1))); /* later cards on top */

        let queued = false;
        const paintStack = () => {
          queued = false;
          const top = stickTop(),
            vh = innerHeight;
          for (let i = 0; i < mods.length - 1; i++) {
            const m = mods[i],
              next = mods[i + 1];
            /* 0 while the next card is still off the bottom, 1 once it has landed
               on the sticky line and is covering this one completely */
            let p = (vh - next.getBoundingClientRect().top) / (vh - top);
            p = p < 0 ? 0 : p > 1 ? 1 : p;
            m.style.transform = "scale(" + (1 - 0.045 * p).toFixed(4) + ")";
            m.style.opacity = p > 0.88 ? (1 - (p - 0.88) / 0.12).toFixed(3) : "1";
            m.style.visibility = p >= 1 ? "hidden" : "visible";
          }
        };
        /* nothing ever covers the last card, so it is set once and left alone */
        const last = mods[mods.length - 1];
        last.style.transform = "none";
        last.style.opacity = "1";
        last.style.visibility = "visible";

        const onScroll = () => {
          if (!queued) {
            queued = true;
            requestAnimationFrame(paintStack);
          }
        };
        on(window, "scroll", onScroll, { passive: true });
        on(window, "resize", onScroll);
        on(window, "load", onScroll);
        paintStack();
      }

      /* If a photo can't load, remove it so the figure's duotone shows instead of
         a broken-image icon and alt text. Checked on init too — the error event
         often fires before this runs. */
      root.querySelectorAll<HTMLImageElement>(".shot img").forEach((img) => {
        const drop = () => img.remove();
        img.addEventListener("error", drop);
        if (img.complete && img.naturalWidth === 0) drop();
      });

      /* ---------- 6. counters ---------- */
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const to = parseFloat(el.dataset.count || "0"),
          dec = parseInt(el.dataset.dec || "0", 10);
        const suf = el.dataset.suffix || "",
          pre = el.dataset.prefix || "";
        const paint = (v: number) =>
          (el.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString()) + suf);
        if (reduce) {
          paint(to);
          return;
        }
        paint(0);
        const o = { v: 0 };
        gsap.to(o, {
          v: to,
          duration: 1.5,
          ease: "expo.out",
          onUpdate: () => paint(o.v),
          scrollTrigger: { trigger: el, start: "top 92%" },
        });
      });

      /* ---------- 7. keep triggers honest ---------- */
      if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
      on(window, "load", () => ScrollTrigger.refresh());
    }, root);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, [rootRef]);
}

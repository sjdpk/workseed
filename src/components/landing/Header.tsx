"use client";

import { gsap } from "gsap";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components";
import type { HomepageContent } from "@/lib/homepage";
import { ChevronRight } from "./icons";

export function Header({ content }: { content: HomepageContent }) {
  const NAV = content.nav.filter((l) => l.show);

  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  /* drawer height animation + escape/resize handling */
  useEffect(() => {
    const drawer = drawerRef.current;
    const inner = innerRef.current;
    if (!drawer || !inner) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const h = menuOpen ? inner.offsetHeight : 0;
    if (reduce) drawer.style.height = h + "px";
    else gsap.to(drawer, { height: h, duration: 0.42, ease: "power3.inOut" });
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        burgerRef.current?.focus();
      }
    };
    /* if the viewport grows back to desktop, the drawer must not be left hanging open */
    const wide = matchMedia("(min-width:1061px)");
    const onWide = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
    };
    addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [menuOpen]);

  return (
    <header>
      <div className="nav">
        <a className="logo" href="#top" aria-label={`${content.brandName} home`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic URL from org settings */}
          <img src={content.logoUrl} alt="" />
          {content.brandName}
        </a>
        <nav className="nav-links">
          {NAV.map((l) => (
            <a key={`${l.label}-${l.href}`} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="nav-right">
          {/* same Light / Dark / Auto control as the login and dashboard screens */}
          <ThemeToggle />
          <Link className="btn pri start-nav" href="/login">
            Sign in
          </Link>
          <button
            ref={burgerRef}
            className="burger"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="ws-drawer"
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <div
        className={`drawer${menuOpen ? " open" : ""}`}
        id="ws-drawer"
        ref={drawerRef}
        style={{ height: 0 }}
      >
        <div className="drawer-in" ref={innerRef}>
          {NAV.map((l) => (
            <a
              key={`${l.label}-${l.href}`}
              className="dl"
              href={l.href}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
              <ChevronRight />
            </a>
          ))}
          <div className="two-up">
            <Link className="btn pri" href="/login" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

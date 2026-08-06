"use client";

import { useRef } from "react";
import type { HomepageContent } from "@/lib/homepage";
import { Contact } from "./Contact";
import { Cursor } from "./Cursor";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Section } from "./Sections";
import { SiteFooter } from "./SiteFooter";
import "./landing.css";
import { useLandingMotion } from "./useLandingMotion";

export function Landing({ content }: { content: HomepageContent }) {
  const root = useRef<HTMLDivElement>(null);
  useLandingMotion(root);

  return (
    <div className="ws-landing" ref={root}>
      <Cursor />
      <Header content={content} />
      <main id="top">
        <Hero content={content} />
        {content.sections
          .filter((s) => s.show && s.cards.length)
          .map((s) => (
            <Section key={s.id} section={s} />
          ))}
        {content.contact.show && <Contact content={content} />}
      </main>
      <SiteFooter content={content} />
    </div>
  );
}

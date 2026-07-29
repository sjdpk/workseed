"use client";

import { useRef } from "react";
import { Cursor } from "./Cursor";
import { DemoCta } from "./DemoCta";
import { Faq } from "./Faq";
import { Gallery } from "./Gallery";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { Metrics } from "./Metrics";
import { MobileApp } from "./MobileApp";
import { Modules } from "./Modules";
import { Pricing } from "./Pricing";
import { SiteFooter } from "./SiteFooter";
import { Stories } from "./Stories";
import { Ticker } from "./Ticker";
import "./landing.css";
import { useLandingMotion } from "./useLandingMotion";

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  useLandingMotion(root);

  return (
    <div className="ws-landing" ref={root}>
      <Cursor />
      <Header />
      <main id="top">
        <Hero />
        <Ticker />
        <Modules />
        <Gallery />
        <HowItWorks />
        <Stories />
        <Metrics />
        <MobileApp />
        <Pricing />
        <Faq />
        <DemoCta />
      </main>
      <SiteFooter />
    </div>
  );
}

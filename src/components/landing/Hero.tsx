"use client";

import Link from "next/link";
import type { HomepageContent } from "@/lib/homepage";

export function Hero({ content }: { content: HomepageContent }) {
  const { hero } = content;
  const first = hero.titleWords[0] ?? "";
  const second = hero.subtitleWords[0] ?? "";

  return (
    <section className="hero">
      <div className="hero-plate">
        {hero.note ? (
          <div className="rails">
            <div className="rail rail-l">
              <div
                className="float f2"
                data-depth="2.2"
                style={{ "--r2": "2deg" } as React.CSSProperties}
              >
                <div className="in" style={{ animationDelay: "-2.2s" }}>
                  <div className="note" style={{ position: "relative" }}>
                    <span className="pin" aria-hidden="true" />
                    {hero.note}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="hero-mid">
          <h1>
            <span className="line">
              <span>
                {/* the rotating word cycles through the configured list; the
                    screen-reader copy reads them all out once */}
                <span className="rot" data-words={hero.titleWords.join("|")} aria-hidden="true">
                  <i>{first}</i>
                </span>
                <span className="sr">{hero.titleWords.join(", ")}</span> {hero.titleTail}
              </span>
            </span>
            <span className="line">
              <span className="soft">
                <span className="rot" data-words={hero.subtitleWords.join("|")} aria-hidden="true">
                  <i>{second}</i>
                </span>
                <span className="sr">{hero.subtitleWords.join(", ")}</span> {hero.subtitleTail}
              </span>
            </span>
          </h1>
          {hero.intro ? <p className="sub">{hero.intro}</p> : null}
          <div className="hero-cta">
            <Link className="btn pri lg" href="/login">
              Sign in
            </Link>
            {hero.secondaryLabel ? (
              <a className="btn lg" href={hero.secondaryHref || "#top"}>
                {hero.secondaryLabel}
              </a>
            ) : null}
          </div>
          {hero.footnote ? <p className="hero-note muted">{hero.footnote}</p> : null}
        </div>
      </div>
    </section>
  );
}

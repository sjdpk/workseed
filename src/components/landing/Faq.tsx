"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

const QAS = [
  {
    q: "Can you take our history, or do we start from zero?",
    a: "We import the full history: employment dates, salary changes, leave balances, and the last three payroll cycles for reconciliation. Anything ambiguous comes back to you as a list to confirm rather than a silent guess.",
  },
  {
    q: "Who can see salary and medical information?",
    a: "Only the roles you allow, field by field. Managers typically see band and leave but not exact pay or sickness reasons. Every view of a sensitive field is logged, and you can run that report yourself at any time.",
  },
  {
    q: "Does it handle shift work and unsocial hours?",
    a: "Yes — that's most of our healthcare and logistics customers. Rotas, minimum cover per shift, night and weekend premiums, and TOIL all feed the payroll run without a second entry.",
  },
  {
    q: "What happens to our data if we leave?",
    a: "You export everything — records, documents, payslips, audit log — as CSV and PDF, whenever you like, with no exit fee. We delete our copies 30 days after you confirm the export, or immediately on request.",
  },
  {
    q: "Which systems does it connect to?",
    a: "Around 40 out of the box, including accounting, identity, applicant tracking and chat tools. Anything else goes through a documented REST API and webhooks, and we'll help you build the first one.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  const bodies = useRef<Array<HTMLDivElement | null>>([]);
  const mounted = useRef(false);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    bodies.current.forEach((body, i) => {
      if (!body) return;
      const target = i === open ? "auto" : 0;
      if (!mounted.current || reduce) {
        body.style.height = target === 0 ? "0px" : "auto";
        return;
      }
      gsap.to(body, {
        height: target,
        duration: target === 0 ? 0.4 : 0.5,
        ease: "power2.inOut",
        /* the accordion changes page height, so triggers below it must re-measure */
        onComplete: () => ScrollTrigger.refresh(),
      });
    });
    mounted.current = true;
  }, [open]);

  return (
    <section id="faq">
      <div className="wrap">
        <div className="sec-head center">
          <span className="mono">Questions</span>
          <h2 data-reveal>Asked on nearly every demo.</h2>
        </div>
        <div className="faq">
          {QAS.map((qa, i) => (
            <div className={`qa${open === i ? " open" : ""}`} key={qa.q}>
              <button
                type="button"
                aria-expanded={open === i}
                aria-controls={`qa-${i}`}
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                {qa.q}
                <i />
              </button>
              <div
                className="body"
                id={`qa-${i}`}
                ref={(el) => {
                  bodies.current[i] = el;
                }}
              >
                <p>{qa.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

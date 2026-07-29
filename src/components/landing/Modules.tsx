/* eslint-disable @next/next/no-img-element -- remote editorial photography, no
   loader/optimisation wanted: the .shot figure owns sizing and the duotone
   fallback, and the motion hook removes any <img> that fails to load. */
import { CheckIcon } from "./icons";

const MODULES = [
  {
    kicker: "01 · People records",
    title: "One record the whole system reads from.",
    body: "Contracts, salary history, I-9 and work authorization records and org position — versioned, permissioned, and yours to export whenever you like.",
    points: [
      "Field-level permissions",
      "Work authorization alerts, 60 days out",
      "Every change audited",
    ],
    g1: "#3A4457",
    g2: "#171C25",
    img: "https://images.unsplash.com/photo-1583521214690-73421a1829a9?auto=format&fit=crop&w=1100&q=72",
    alt: "Stacks of paper personnel files and folders",
    stat: "12 yrs",
    statLabel: "of history imported, reconciled",
    credit: "Wesley Tingey · Unsplash",
  },
  {
    kicker: "02 · Time & leave",
    title: "Requests that clear themselves when policy allows.",
    body: "Write the rules once — accrual, carry-over, minimum cover per shift. Managers only see what actually needs a decision.",
    points: [
      "Auto-approve inside policy",
      "Clock in from web, mobile or tablet",
      "Overtime flows into payroll",
    ],
    g1: "#4A4030",
    g2: "#1B1913",
    img: "https://images.unsplash.com/photo-1564091880021-bb02f2b2928d?auto=format&fit=crop&w=1100&q=72",
    alt: "An analog wall clock showing quarter to twelve",
    stat: "1",
    statLabel: "decision instead of twelve",
    credit: "Joshua Hoehne · Unsplash",
  },
  {
    kicker: "03 · Payroll",
    title: "A run you check in ten minutes, not a morning.",
    body: "Workseeds assembles the cycle from what already happened, then shows you only what moved since last month.",
    points: [
      "Variance view, not 214 payslips",
      "941s, W-2s and 401(k) filed on approval",
      "14 markets on one calendar",
    ],
    g1: "#2E3760",
    g2: "#141726",
    img: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1100&q=72",
    alt: "Reviewing figures on paper at a desk",
    stat: "9 min",
    statLabel: "median review, was a morning",
    credit: "Scott Graham · Unsplash",
  },
  {
    kicker: "04 · Performance",
    title: "Review cycles that actually finish.",
    body: "Set the window and let Workseeds chase. Managers arrive to a page of context instead of an empty form.",
    points: [
      "Goals carry forward automatically",
      "Calibrate before anything is shared",
      "Outcomes feed pay review",
    ],
    g1: "#26473C",
    g2: "#121C18",
    img: "https://images.unsplash.com/photo-1565688534245-05d6b5be184a?auto=format&fit=crop&w=1100&q=72",
    alt: "Two colleagues reviewing documents across a meeting table",
    stat: "92%",
    statLabel: "completion, up from 61%",
    credit: "Van Tay Media · Unsplash",
  },
];

export function Modules() {
  return (
    <section id="modules">
      <div className="wrap">
        <div className="sec-head">
          <span className="mono">Modules · 04</span>
          <h2 data-reveal>One record per person. Everything else hangs off it.</h2>
          <p data-reveal>
            Turn on what you need. Every module writes to the same employee record, so a change of
            address or salary never has to be typed twice.
          </p>
        </div>

        <div className="stack">
          {MODULES.map((m) => (
            <article className="mod" key={m.kicker}>
              <div className="mod-l">
                <span className="mono">{m.kicker}</span>
                <h3>{m.title}</h3>
                <p>{m.body}</p>
                <ul className="pts">
                  {m.points.map((p) => (
                    <li key={p}>
                      <CheckIcon />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <figure
                className="shot mod-r"
                style={{ "--g1": m.g1, "--g2": m.g2 } as React.CSSProperties}
              >
                <img src={m.img} alt={m.alt} loading="lazy" decoding="async" />
                <div className="stat">
                  <b>{m.stat}</b>
                  <span>{m.statLabel}</span>
                </div>
                <span className="credit">{m.credit}</span>
              </figure>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

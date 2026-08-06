import type { HomepageSection } from "@/lib/homepage";

/** One company information block: heading plus its cards. */
export function Section({ section }: { section: HomepageSection }) {
  return (
    <section id={section.id}>
      <div className="wrap">
        {section.heading ? (
          <div className="sec-head center">
            <h2 data-reveal>{section.heading}</h2>
          </div>
        ) : null}
        <div className="cards">
          {section.cards.map((c, i) => (
            <div className="step" key={`${c.title}-${i}`}>
              <span className="idx">{String(i + 1).padStart(2, "0")}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* eslint-disable @next/next/no-img-element -- see Modules.tsx */

const CARDS = [
  {
    g1: "#4A3A44",
    g2: "#1A151A",
    img: "https://images.unsplash.com/photo-1635859890085-ec8cb5466806?auto=format&fit=crop&w=1100&q=72",
    alt: "A person working through a table covered in paperwork",
    badge: "Payroll week",
    credit: "Dimitri Karastelev · Unsplash",
    title: "The Friday deadline",
    body: "We sat in on eleven payroll runs before designing the variance view. Every one ended with somebody checking a spreadsheet against a PDF.",
    initials: "HC",
    who: "Bellrose Health, Columbus",
  },
  {
    g1: "#334A52",
    g2: "#131B1E",
    img: "https://images.unsplash.com/photo-1562564055-71e051d33c19?auto=format&fit=crop&w=1100&q=72",
    alt: "Two people signing and reviewing documents together",
    badge: "Review cycle",
    credit: "Gabrielle Henderson · Unsplash",
    title: "The cycle that stalled",
    body: "Managers weren't ignoring reviews, they were missing the email. Nudges moved to where the work happens and completion went from 61% to 92%.",
    initials: "TO",
    who: "Arcadia Studios, Austin",
  },
  {
    g1: "#3F4436",
    g2: "#171913",
    img: "https://images.unsplash.com/photo-1544396821-4dd40b938ad3?auto=format&fit=crop&w=1100&q=72",
    alt: "Rows of labelled archive files",
    badge: "Audit trail",
    credit: "Viktor Talashuk · Unsplash",
    title: "The filing cabinet",
    body: "Visa expiries lived in one person's calendar. Now every document has an owner, an expiry and an alert 60 days out, whoever is on holiday.",
    initials: "MD",
    who: "Fenwick & Pike, Chicago",
  },
];

export function Gallery() {
  return (
    <section id="inside">
      <div className="wrap">
        <div className="sec-head">
          <span className="mono">Inside the work</span>
          <h2 data-reveal>Built by people who have run a payroll at 6pm on a Friday.</h2>
          <p data-reveal>
            Three of the rooms Workseeds was designed in, and what came out of each.
          </p>
        </div>
        <div className="gallery">
          {CARDS.map((c) => (
            <article className="gcard" key={c.title}>
              <figure
                className="shot"
                style={{ "--g1": c.g1, "--g2": c.g2 } as React.CSSProperties}
              >
                <img src={c.img} alt={c.alt} loading="lazy" decoding="async" />
                <span className="badge">{c.badge}</span>
                <span className="credit">{c.credit}</span>
              </figure>
              <div className="txt">
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <div className="who">
                  <span className="av" aria-hidden="true">
                    {c.initials}
                  </span>
                  <span className="muted">{c.who}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

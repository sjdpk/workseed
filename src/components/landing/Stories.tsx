const STORIES = [
  {
    org: "Bellrose Health · 640 staff",
    quote: '"Rota cover and payroll finally agree with each other."',
    body: "Night shifts were keyed twice, so every month had a handful of wrong payslips. Workseeds pulls the hours straight from the clock-in, and the corrections queue went from 30-odd a month to two.",
    initials: "HC",
    name: "Helen Cross",
    role: "Head of People Operations",
  },
  {
    org: "Northwind Logistics · 1,180 staff",
    quote: '"Four countries, one payroll calendar."',
    body: "Three payroll bureaux and a spreadsheet became one run. Month-end close moved from the eleventh working day to the fourth, and the finance team stopped requesting overtime to get there.",
    initials: "RA",
    name: "Rui Almeida",
    role: "Group Financial Controller",
  },
  {
    org: "Arcadia Studios · 210 staff",
    quote: '"Reviews actually finished, for the first time."',
    body: "Two cycles had quietly died in a shared drive. The nudges land in Slack where the team already lives, and the H1 cycle closed at 92% without anyone chasing on a spreadsheet.",
    initials: "TO",
    name: "Tolu Okafor",
    role: "People Partner",
  },
  {
    org: "Fenwick & Pike · 95 staff",
    quote: '"The audit took an afternoon instead of a fortnight."',
    body: "Every salary change now carries who approved it and when. Their auditors pulled the trail themselves through a read-only login, and came back with no findings.",
    initials: "MD",
    name: "Marianne Dell",
    role: "Practice Director",
  },
];

export function Stories() {
  return (
    <section className="stories" id="stories">
      <div className="st-track">
        <div className="st-intro">
          <span className="mono">Customers · 04</span>
          <h2>Teams that stopped doing this by hand.</h2>
          <p className="mono">Scroll →</p>
        </div>
        {STORIES.map((s) => (
          <article className="story" key={s.name}>
            <span className="mono">{s.org}</span>
            <p className="quote">{s.quote}</p>
            <p>{s.body}</p>
            <div className="who">
              <span className="av lg" aria-hidden="true">
                {s.initials}
              </span>
              <div>
                <b>{s.name}</b>
                <br />
                <span className="muted">{s.role}</span>
              </div>
            </div>
          </article>
        ))}
        <div className="st-intro">
          <h2>Want the reference calls?</h2>
          <a className="btn pri" href="#contact" style={{ alignSelf: "flex-start" }}>
            Ask for three
          </a>
        </div>
      </div>
    </section>
  );
}

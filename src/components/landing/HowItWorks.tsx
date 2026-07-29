const STEPS = [
  {
    idx: "01",
    title: "Import",
    body: "Send your spreadsheets and last three payroll files. We map them, flag every inconsistency, and hand you a list to confirm.",
    week: "Week 1",
  },
  {
    idx: "02",
    title: "Configure",
    body: "Your leave policy, pay bands, approval chains and org structure, built with you in two workshops rather than a questionnaire.",
    week: "Week 2",
  },
  {
    idx: "03",
    title: "Parallel run",
    body: "One payroll cycle in Workseeds alongside your current system. We reconcile to the penny before anything is filed.",
    week: "Week 3",
  },
  {
    idx: "04",
    title: "Go live",
    body: "Employees get access with a walkthrough built for their role. Your old system stays readable for a year.",
    week: "Week 4",
  },
];

export function HowItWorks() {
  return (
    <section id="how">
      <div className="wrap">
        <div className="sec-head center">
          <span className="mono">Migration · 4 weeks</span>
          <h2 data-reveal>Live in a month, including your history.</h2>
          <p data-reveal>
            A named implementation lead runs this with you. Fixed fee, and it&apos;s free above 100
            employees.
          </p>
        </div>
        <div className="grid4">
          {STEPS.map((s) => (
            <div className="step" key={s.idx}>
              <span className="idx">{s.idx}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <span className="mono">{s.week}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

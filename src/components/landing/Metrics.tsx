const METRICS = [
  { count: "9", suffix: " min", body: "To review a full payroll run, down from a morning" },
  { count: "92", suffix: "%", body: "Review cycle completion, up from 61% on spreadsheets" },
  { count: "4", suffix: " days", body: "To close month-end, down from eleven working days" },
  { count: "14", suffix: "h", body: "Admin hours returned to the people team each week" },
];

export function Metrics() {
  return (
    <section>
      <div className="wrap">
        <div className="sec-head center">
          <span className="mono">Across all customers</span>
          <h2 data-reveal>What changes in the first quarter.</h2>
          <p data-reveal>
            Median figures from 340 companies, measured before migration and 90 days after.
          </p>
        </div>
        <div className="metrics">
          {METRICS.map((m) => (
            <div className="metric" key={m.body}>
              {/* the motion hook counts these up from 0 on scroll-in */}
              <span data-count={m.count} data-suffix={m.suffix}>
                0
              </span>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

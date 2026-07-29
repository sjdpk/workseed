const NAMES = [
  "Northwind Logistics",
  "Bellrose Health",
  "Arcadia Studios",
  "Fenwick & Pike",
  "Tidemark Energy",
  "Sable Retail Group",
];

/** Two identical rows so the marquee loops seamlessly at -100%. */
export function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      {[0, 1].map((row) => (
        <div className="t-row" key={row}>
          {NAMES.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

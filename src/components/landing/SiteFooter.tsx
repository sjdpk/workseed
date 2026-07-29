import { WorkseedsMark } from "./icons";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#modules", label: "Modules" },
      { href: "#pricing", label: "Pricing" },
      { href: "#app", label: "Mobile app" },
      { href: "#how", label: "Migration" },
      { href: "#top", label: "Integrations" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#stories", label: "Customers" },
      { href: "#top", label: "Careers · 5 open" },
      { href: "#top", label: "Security" },
      { href: "#faq", label: "Help centre" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "#top", label: "Privacy" },
      { href: "#top", label: "Terms" },
      { href: "#top", label: "DPA" },
      { href: "#top", label: "Sub-processors" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <a className="logo" href="#top">
              <WorkseedsMark />
              Workseeds
            </a>
            <p className="muted" style={{ maxWidth: "34ch", marginTop: 14, fontSize: ".93rem" }}>
              HR, time and payroll on one record. Built in Denver, used in 14 markets.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <span className="mono">{c.title}</span>
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="foot-end">
          <span className="mono">© 2026 Workseeds, Inc.</span>
          <span className="mono">Hand-built · Next.js + GSAP</span>
        </div>
      </div>
    </footer>
  );
}

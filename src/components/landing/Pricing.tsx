import { CheckIcon } from "./icons";

const TIERS = [
  {
    name: "Core",
    price: "$6",
    unit: "/ employee / month",
    blurb: "For teams under 100 keeping records and leave in one place.",
    features: [
      "People records and documents",
      "Leave, policy rules, team calendar",
      "Onboarding checklists and e-signature",
      "Free mobile app for every employee",
    ],
    cta: "Start free",
    best: false,
  },
  {
    name: "Complete",
    price: "$12",
    unit: "/ employee / month",
    blurb: "Everything in Core, plus payroll and reviews on the same record.",
    features: [
      "Payroll with variance review and filing",
      "Timesheets, overtime and shift cover",
      "Review cycles and pay review",
      "Named implementation lead, free above 100",
    ],
    cta: "Book a demo",
    best: true,
  },
  {
    name: "Enterprise",
    price: "Talk",
    unit: "to us",
    blurb: "Multi-entity groups, works councils, and procurement that needs paper.",
    features: [
      "14 markets, multi-currency, multi-entity",
      "SSO, SCIM provisioning, custom retention",
      "Data residency in US, EU or AU",
      "99.95% SLA with credits, quarterly review",
    ],
    cta: "Contact sales",
    best: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing">
      <div className="wrap">
        <div className="sec-head center">
          <span className="mono">Pricing</span>
          <h2 data-reveal>Per employee, per month. That&apos;s the whole model.</h2>
          <p data-reveal>
            No implementation fee above 100 employees, no charge for admins, no per-module upsell
            once you&apos;re on a plan.
          </p>
        </div>
        <div className="tiers">
          {TIERS.map((t) => (
            <div className={`tier${t.best ? " best" : ""}`} key={t.name}>
              <h3>{t.name}</h3>
              <div className="price">
                <b>{t.price}</b>
                <span>{t.unit}</span>
              </div>
              <p className="muted" style={{ fontSize: ".94rem" }}>
                {t.blurb}
              </p>
              <ul>
                {t.features.map((f) => (
                  <li key={f}>
                    <CheckIcon size={16} strokeWidth={2.8} />
                    {f}
                  </li>
                ))}
              </ul>
              <a className={`btn${t.best ? " pri" : ""}`} href="#contact">
                {t.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

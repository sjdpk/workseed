"use client";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-plate">
        {/* cards live in rails sized from the leftover gutter, so they can
            never overlap the centre column */}
        <div className="rails">
          <div className="rail rail-l">
            <div
              className="float f1"
              data-depth="1.5"
              style={{ "--r2": "-2deg" } as React.CSSProperties}
            >
              <div className="in" style={{ animationDelay: "-.6s" }}>
                <div className="card">
                  <div className="w-title" style={{ gap: 8 }}>
                    <span className="av" aria-hidden="true">
                      PS
                    </span>
                    <span style={{ flex: 1 }}>Onboarding · Priya S.</span>
                    <span className="chip acc">Day 2</span>
                  </div>
                  <div className="row">
                    <span style={{ flex: 1, fontSize: ".86rem" }}>Contract signed</span>
                    <span className="chip ok">Done</span>
                  </div>
                  <div className="row">
                    <span style={{ flex: 1, fontSize: ".86rem" }}>Right to work</span>
                    <span className="chip ok">Done</span>
                  </div>
                  <div className="row">
                    <span style={{ flex: 1, fontSize: ".86rem" }}>Laptop shipped</span>
                    <span className="chip warn">Today</span>
                  </div>
                  <div className="row">
                    <span style={{ flex: 1, fontSize: ".86rem" }}>Payroll profile</span>
                    <span className="chip warn">Today</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="float f2"
              data-depth="2.4"
              style={{ "--r2": "2deg" } as React.CSSProperties}
            >
              <div className="in" style={{ animationDelay: "-2.2s" }}>
                <div className="note" style={{ position: "relative" }}>
                  <span className="pin" aria-hidden="true" />
                  Approvals used to sit in my inbox for a week. Now they clear before I&apos;ve made
                  coffee.
                </div>
              </div>
            </div>
            <div
              className="float f5"
              data-depth="2.8"
              style={{ "--r2": "3deg" } as React.CSSProperties}
            >
              <div className="in" style={{ animationDelay: "-1.9s" }}>
                <div className="card">
                  <div className="w-title">Timesheet · week 30</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                    <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
                      <circle
                        cx="21"
                        cy="21"
                        r="19"
                        fill="none"
                        stroke="var(--line-strong)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="19"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="3.4"
                        strokeLinecap="round"
                        strokeDasharray="119"
                        strokeDashoffset="26"
                        transform="rotate(-90 21 21)"
                      />
                      <circle cx="21" cy="21" r="2" fill="var(--ink)" />
                    </svg>
                    <div>
                      <div className="big-num">37.5h</div>
                      <span className="mono" style={{ fontSize: 10 }}>
                        of 40 logged
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rail rail-r">
            <div
              className="float f3"
              data-depth="1.2"
              style={{ "--r2": "2deg" } as React.CSSProperties}
            >
              <div className="in" style={{ animationDelay: "-1.4s" }}>
                <div className="card">
                  <div className="w-title">
                    Leave request <span className="chip ok">Approved</span>
                  </div>
                  <div className="row">
                    <span className="av" aria-hidden="true">
                      MO
                    </span>
                    <div style={{ flex: 1, fontSize: ".86rem", lineHeight: 1.3 }}>
                      Marcus Obi
                      <br />
                      <span className="mono" style={{ fontSize: 10 }}>
                        PTO · 4 days
                      </span>
                    </div>
                  </div>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontSize: 10 }}>
                      12–15 Aug
                    </span>
                    <span className="mono" style={{ fontSize: 10 }}>
                      18 days left
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="float f6"
              data-depth="3.2"
              style={{ "--r2": "-3deg" } as React.CSSProperties}
            >
              <div className="in" style={{ animationDelay: "-4.1s" }}>
                <div className="card">
                  <div className="w-title">Syncs with</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span className="chip acc">Slack</span>
                    <span className="chip acc">Xero</span>
                    <span className="chip acc">Okta</span>
                    <span className="chip acc">Greenhouse</span>
                    <span className="chip acc">+34 more</span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="float f4"
              data-depth="1.8"
              style={{ "--r2": "-2deg" } as React.CSSProperties}
            >
              <div className="in" style={{ animationDelay: "-3.4s" }}>
                <div className="card">
                  <div className="w-title">
                    July payroll <span className="chip ok">Ready</span>
                  </div>
                  <div className="big-num">$1,284,900</div>
                  <div className="spark" aria-hidden="true">
                    <i style={{ height: "44%" }} />
                    <i style={{ height: "58%" }} />
                    <i style={{ height: "51%" }} />
                    <i style={{ height: "70%" }} />
                    <i style={{ height: "64%" }} />
                    <i style={{ height: "88%" }} />
                  </div>
                  <div className="row" style={{ marginTop: 6 }}>
                    <span className="mono" style={{ fontSize: 10, flex: 1 }}>
                      214 people · 3 countries
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-mid">
          <h1>
            <span className="line">
              <span>
                <span
                  className="rot"
                  data-words="Onboard|Promote|Transfer|Offboard"
                  aria-hidden="true"
                >
                  <i>Onboard</i>
                </span>
                <span className="sr">Onboard, promote, transfer or offboard</span> on Monday.
              </span>
            </span>
            <span className="line">
              <span className="soft">
                <span
                  className="rot"
                  data-words="Payroll|Timesheets|Approvals|Reporting"
                  aria-hidden="true"
                >
                  <i>Payroll</i>
                </span>
                <span className="sr">Payroll, timesheets, approvals and reporting</span> by Friday.
              </span>
            </span>
          </h1>
          <p className="sub">
            Workseeds keeps records, leave, timesheets, payroll and reviews on one system — so your
            people team spends its week on people, not on chasing signatures.
          </p>
          <div className="hero-cta">
            <a className="btn pri lg" href="#contact">
              Book a 20-minute demo
            </a>
            <a className="btn lg" href="#modules">
              See the modules
            </a>
          </div>
          <p className="hero-note muted">
            Free for your first 10 employees · No card, no sales call to start
          </p>
        </div>
      </div>
    </section>
  );
}

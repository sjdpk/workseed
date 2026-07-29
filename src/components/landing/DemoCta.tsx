"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useState } from "react";
import { ChevronDown } from "./icons";

/** Demo-request form. Validation only — there is no lead endpoint yet, so a
 *  successful submit just swaps in the confirmation panel. Wire `submit()` to
 *  an API route (e.g. /api/leads) when the endpoint exists. */
export function DemoCta() {
  const [err, setErr] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const company = String(data.get("company") || "").trim();

    if (!name) return setErr("Add your name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return setErr("Enter a work email we can reply to");
    if (!company) return setErr("Add your company");

    setErr("");
    setSentTo(email);
    ScrollTrigger.refresh();
  };

  return (
    <section id="contact">
      <div className="wrap">
        <div className="cta">
          <div>
            <span className="mono">Get a demo</span>
            <h2>See it with your own numbers.</h2>
            <p className="lede">
              Send a sample of your data and we&apos;ll run a real payroll cycle in the demo, so
              you&apos;re not looking at a fictional company. 20 minutes, no slides.
            </p>
            <div className="trust">
              <div>
                <b>ISO 27001</b>
                <span className="muted" style={{ fontSize: ".88rem" }}>
                  Certified
                </span>
              </div>
              <div>
                <b>US, EU, AU</b>
                <span className="muted" style={{ fontSize: ".88rem" }}>
                  Data residency
                </span>
              </div>
              <div>
                <b>99.95%</b>
                <span className="muted" style={{ fontSize: ".88rem" }}>
                  SLA uptime
                </span>
              </div>
            </div>
          </div>

          {sentTo ? (
            <div className="sent">
              Booked. We&apos;ll email {sentTo} within one working day with two times and the data
              template.
            </div>
          ) : (
            <form noValidate onSubmit={submit}>
              <div className="two">
                <label>
                  <span>Full name</span>
                  <input type="text" name="name" placeholder="Alex Mercer" autoComplete="name" />
                </label>
                <label>
                  <span>Work email</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="alex@company.com"
                    autoComplete="email"
                  />
                </label>
              </div>
              <div className="two">
                <label>
                  <span>Company</span>
                  <input
                    type="text"
                    name="company"
                    placeholder="Company name"
                    autoComplete="organization"
                  />
                </label>
                <label>
                  <span>Headcount</span>
                  <span className="sel">
                    <select name="size" defaultValue="1–50">
                      <option>1–50</option>
                      <option>51–200</option>
                      <option>201–1,000</option>
                      <option>1,000+</option>
                    </select>
                    <ChevronDown />
                  </span>
                </label>
              </div>
              <label>
                <span>What are you replacing?</span>
                <textarea
                  name="detail"
                  placeholder="Spreadsheets, a payroll bureau, another HR system…"
                />
              </label>
              <p className="err" role="status" aria-live="polite">
                {err}
              </p>
              <button className="btn pri lg" type="submit">
                Request a demo
              </button>
              <p className="form-note">
                A person replies within one working day. No sequences, no newsletter.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

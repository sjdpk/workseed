import { CheckIcon } from "./icons";

const POINTS = [
  "Clock in and out from any site",
  "Book time off, see who else is out",
  "Pay stubs and tax documents",
  "Approve a request in two taps",
];

export function MobileApp() {
  return (
    <section id="app">
      <div className="wrap">
        <div className="appband">
          <div>
            <span className="mono">Included, not an add-on</span>
            <h2>The app is free for every employee, on every plan.</h2>
            <p>
              Most of your headcount will never open the web app — they need four things from HR
              software, and all four fit on a phone. So we don&apos;t charge for it: no per-seat app
              licence, no minimum, nothing new to negotiate at renewal.
            </p>
            <ul className="pts">
              {POINTS.map((p) => (
                <li key={p}>
                  <CheckIcon />
                  {p}
                </li>
              ))}
            </ul>
            <div className="applinks">
              <span className="chip free">Free forever</span>
              <span className="chip">iOS 15+</span>
              <span className="chip">Android 9+</span>
            </div>
          </div>

          {/* phone, drawn rather than screenshotted */}
          <div className="phone" aria-hidden="true">
            <span className="notch" />
            <div className="screen">
              <div className="ph-top">
                <span>Tuesday, 12 Aug</span>
                <span className="chip ok">On shift</span>
              </div>
              <div className="clockin">
                <b>6h 12m</b>
                <span>Tap to clock out</span>
              </div>
              <div className="ph-card">
                <div className="w-title">This week</div>
                <div className="ph-row">
                  <span>Hours logged</span>
                  <b>37.5</b>
                </div>
                <div className="ph-row">
                  <span>Overtime</span>
                  <b>2.0</b>
                </div>
                <div className="ph-row">
                  <span>PTO left</span>
                  <b>18 days</b>
                </div>
              </div>
              <div className="ph-card">
                <div className="w-title">
                  To approve <span className="chip acc">2</span>
                </div>
                <div className="ph-row">
                  <span>Sana R. · 2 days</span>
                  <span className="chip warn">Cover</span>
                </div>
                <div className="ph-row">
                  <span>Jonah W. · 4 days</span>
                  <span className="chip ok">Clear</span>
                </div>
              </div>
              <div className="tabs">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

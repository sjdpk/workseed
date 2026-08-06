import Link from "next/link";
import type { HomepageContent } from "@/lib/homepage";

export function SiteFooter({ content }: { content: HomepageContent }) {
  const links = content.nav.filter((l) => l.show);

  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <a className="logo" href="#top">
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic URL from org settings */}
              <img src={content.logoUrl} alt="" />
              {content.brandName}
            </a>
            {content.footerNote ? (
              <p className="muted" style={{ maxWidth: "38ch", marginTop: 14, fontSize: ".93rem" }}>
                {content.footerNote}
              </p>
            ) : null}
          </div>
          <nav className="foot-links">
            {links.map((l) => (
              <a key={`${l.label}-${l.href}`} href={l.href}>
                {l.label}
              </a>
            ))}
            <Link href="/login">Sign in</Link>
          </nav>
        </div>
        <div className="foot-end">
          <span className="mono">{content.brandName}</span>
          <span className="mono">© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

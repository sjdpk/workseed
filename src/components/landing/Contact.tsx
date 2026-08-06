import type { HomepageContent } from "@/lib/homepage";

export function Contact({ content }: { content: HomepageContent }) {
  const { contact } = content;
  const rows = [
    { label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    { label: "Phone", value: contact.phone, href: `tel:${contact.phone.replace(/\s+/g, "")}` },
    { label: "Office", value: contact.address, href: "" },
    { label: "Hours", value: contact.hours, href: "" },
  ].filter((r) => r.value);

  return (
    <section id="contact">
      <div className="wrap">
        <div className="cta cta-single">
          <div>
            <h2>{contact.heading}</h2>
            {contact.body ? <p className="lede">{contact.body}</p> : null}
            {rows.length ? (
              <dl className="info">
                {rows.map((r) => (
                  <div key={r.label}>
                    <dt className="mono">{r.label}</dt>
                    <dd>{r.href ? <a href={r.href}>{r.value}</a> : r.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Input, PageHeader, useToast } from "@/components";
import {
  DEFAULT_HOMEPAGE,
  sectionSlug,
  type HomepageContent,
  type HomepageSection,
} from "@/lib/homepage";

const ALLOWED_ROLES = ["ADMIN"];

const textareaClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors " +
  "focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 " +
  "dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 " +
  "dark:focus:border-gray-100 dark:focus:ring-gray-100";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

function ShowToggle({
  checked,
  onChange,
  label = "Show",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
      />
      {label}
    </label>
  );
}

/** Admin editor for the public page at "/". The layout is fixed; the nav links,
 *  the content blocks and every line of copy are set here and stored on
 *  organization settings. */
export default function HomepageSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HomepageContent>(DEFAULT_HOMEPAGE);
  /* name and logo live in Settings → Organization; shown here read-only so the
     same value is never editable in two places */
  const [org, setOrg] = useState<{ name: string; logoUrl: string | null }>({
    name: "",
    logoUrl: null,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(([meData, orgData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (orgData.success) {
        const stored = (orgData.data.settings.homepage || {}) as Partial<HomepageContent>;
        setOrg({
          name: orgData.data.settings.name || "",
          logoUrl: orgData.data.settings.logoUrl || null,
        });
        setForm({
          ...DEFAULT_HOMEPAGE,
          ...stored,
          nav: stored.nav?.length ? stored.nav : DEFAULT_HOMEPAGE.nav,
          hero: { ...DEFAULT_HOMEPAGE.hero, ...(stored.hero || {}) },
          sections: stored.sections?.length ? stored.sections : DEFAULT_HOMEPAGE.sections,
          contact: { ...DEFAULT_HOMEPAGE.contact, ...(stored.contact || {}) },
        });
      }
      setLoading(false);
    });
  }, [router]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // ids are anchors, so they are normalised before they reach the page.
      // brandName/logoUrl are organization settings and are not stored here.
      const { brandName: _brand, logoUrl: _logo, ...rest } = form;
      const payload = {
        ...rest,
        sections: form.sections.map((s, i) => ({
          ...s,
          id: sectionSlug(s.id || s.heading, `section-${i + 1}`),
        })),
      };
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homepage: payload }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to save home page");
        return;
      }
      setForm({ ...form, ...payload });
      toast.success("Home page updated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  const setHero = (patch: Partial<HomepageContent["hero"]>) =>
    setForm((f) => ({ ...f, hero: { ...f.hero, ...patch } }));
  const setContact = (patch: Partial<HomepageContent["contact"]>) =>
    setForm((f) => ({ ...f, contact: { ...f.contact, ...patch } }));
  const setSection = (index: number, patch: Partial<HomepageSection>) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <PageHeader
        title="Home Page"
        subtitle={
          <>
            What people see at{" "}
            <a href="/" target="_blank" rel="noreferrer" className="underline">
              the site root
            </a>{" "}
            before signing in.
          </>
        }
        actions={
          <>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      />

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic URL from org settings */}
          <img
            src={org.logoUrl || "/logo.svg"}
            alt=""
            className="h-10 w-10 rounded-xl object-contain"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {org.name || "Your organization"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Name and logo on the home page, the sign-in screen and every email.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/settings/organization"
          className="text-sm text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Change in Organization
        </Link>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Menu links</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Shown in the header and the footer. Use{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">#section-name</code> for a
          block on this page, or a full address for anything else. Unticked links stay saved but are
          not shown.
        </p>
        <div className="space-y-3">
          {form.nav.map((item, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
              <Input
                placeholder="Label"
                value={item.label}
                onChange={(e) => {
                  const nav = [...form.nav];
                  nav[i] = { ...nav[i], label: e.target.value };
                  setForm({ ...form, nav });
                }}
              />
              <Input
                placeholder="#about"
                value={item.href}
                onChange={(e) => {
                  const nav = [...form.nav];
                  nav[i] = { ...nav[i], href: e.target.value };
                  setForm({ ...form, nav });
                }}
              />
              <ShowToggle
                checked={item.show}
                onChange={(show) => {
                  const nav = [...form.nav];
                  nav[i] = { ...nav[i], show };
                  setForm({ ...form, nav });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setForm({ ...form, nav: form.nav.filter((_, x) => x !== i) })}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setForm({ ...form, nav: [...form.nav, { label: "", href: "", show: true }] })
            }
          >
            Add link
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Headline</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Rotating words — first line"
            hint="Comma separated. They cycle on the page."
          >
            <Input
              value={form.hero.titleWords.join(", ")}
              onChange={(e) =>
                setHero({ titleWords: e.target.value.split(",").map((w) => w.trim()) })
              }
            />
          </Field>
          <Input
            label="Rest of the first line"
            value={form.hero.titleTail}
            onChange={(e) => setHero({ titleTail: e.target.value })}
          />
          <Field label="Rotating words — second line" hint="Comma separated.">
            <Input
              value={form.hero.subtitleWords.join(", ")}
              onChange={(e) =>
                setHero({ subtitleWords: e.target.value.split(",").map((w) => w.trim()) })
              }
            />
          </Field>
          <Input
            label="Rest of the second line"
            value={form.hero.subtitleTail}
            onChange={(e) => setHero({ subtitleTail: e.target.value })}
          />
        </div>
        <Field label="Intro paragraph">
          <textarea
            rows={2}
            className={textareaClass}
            value={form.hero.intro}
            onChange={(e) => setHero({ intro: e.target.value })}
          />
        </Field>
        <Field label="Sticky note" hint="The yellow note beside the headline. Blank hides it.">
          <textarea
            rows={2}
            className={textareaClass}
            value={form.hero.note}
            onChange={(e) => setHero({ note: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Second button" hint="Blank hides it. Sign in is always shown.">
            <Input
              placeholder="About us"
              value={form.hero.secondaryLabel}
              onChange={(e) => setHero({ secondaryLabel: e.target.value })}
            />
          </Field>
          <Input
            label="Second button link"
            placeholder="#about"
            value={form.hero.secondaryHref}
            onChange={(e) => setHero({ secondaryHref: e.target.value })}
          />
        </div>
        <Input
          label="Line under the buttons"
          value={form.hero.footnote}
          onChange={(e) => setHero({ footnote: e.target.value })}
        />
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Content blocks</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setForm({
                ...form,
                sections: [
                  ...form.sections,
                  {
                    id: `section-${form.sections.length + 1}`,
                    heading: "",
                    show: true,
                    cards: [{ title: "", body: "" }],
                  },
                ],
              })
            }
          >
            Add block
          </Button>
        </div>

        {form.sections.map((section, si) => (
          <Card key={si} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Block {si + 1}
              </span>
              <div className="flex items-center gap-3">
                <ShowToggle
                  checked={section.show}
                  onChange={(show) => setSection(si, { show })}
                  label="Show block"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({ ...form, sections: form.sections.filter((_, x) => x !== si) })
                  }
                >
                  Delete block
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Heading"
                value={section.heading}
                onChange={(e) => setSection(si, { heading: e.target.value })}
              />
              <Field label="Link anchor" hint="Menu links point here, e.g. #about.">
                <Input
                  placeholder="about"
                  value={section.id}
                  onChange={(e) => setSection(si, { id: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Cards">
              <div className="space-y-3">
                {section.cards.map((card, ci) => (
                  <div key={ci} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
                    <Input
                      placeholder="Title"
                      value={card.title}
                      onChange={(e) => {
                        const cards = [...section.cards];
                        cards[ci] = { ...cards[ci], title: e.target.value };
                        setSection(si, { cards });
                      }}
                    />
                    <textarea
                      rows={2}
                      className={textareaClass}
                      placeholder="A line or two"
                      value={card.body}
                      onChange={(e) => {
                        const cards = [...section.cards];
                        cards[ci] = { ...cards[ci], body: e.target.value };
                        setSection(si, { cards });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSection(si, { cards: section.cards.filter((_, x) => x !== ci) })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSection(si, { cards: [...section.cards, { title: "", body: "" }] })
                  }
                >
                  Add card
                </Button>
              </div>
            </Field>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Contact</h2>
          <ShowToggle
            checked={form.contact.show}
            onChange={(show) => setContact({ show })}
            label="Show section"
          />
        </div>
        <Input
          label="Heading"
          value={form.contact.heading}
          onChange={(e) => setContact({ heading: e.target.value })}
        />
        <Field label="Paragraph">
          <textarea
            rows={2}
            className={textareaClass}
            value={form.contact.body}
            onChange={(e) => setContact({ body: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            placeholder="hr@company.com"
            value={form.contact.email}
            onChange={(e) => setContact({ email: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.contact.phone}
            onChange={(e) => setContact({ phone: e.target.value })}
          />
          <Input
            label="Office"
            value={form.contact.address}
            onChange={(e) => setContact({ address: e.target.value })}
          />
          <Input
            label="Working hours"
            placeholder="Sun–Fri, 9:30–18:00"
            value={form.contact.hours}
            onChange={(e) => setContact({ hours: e.target.value })}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Blank rows are not shown on the page.
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Footer</h2>
        <Field label="Footer note">
          <textarea
            rows={2}
            className={textareaClass}
            value={form.footerNote}
            onChange={(e) => setForm({ ...form, footerNote: e.target.value })}
          />
        </Field>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setForm({ ...DEFAULT_HOMEPAGE, brandName: form.brandName, logoUrl: form.logoUrl })
          }
        >
          Reset to defaults
        </Button>
      </div>
    </form>
  );
}

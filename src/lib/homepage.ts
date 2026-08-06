/**
 * Home page content — types, defaults and merge only.
 *
 * The public page at "/" has a fixed layout; every line written on it comes from
 * `organization_settings.homepage`, so each company configures its own copy from
 * Settings → Home Page (admin only). Stored values are merged over the defaults
 * below, so a partial or empty config still renders a complete page.
 *
 * Kept free of database imports so the admin editor (a client component) can
 * import the defaults. The database read lives in `homepage-server.ts`.
 */

export interface HomepageCard {
  title: string;
  body: string;
}

/** A content block on the page: a heading plus any number of cards. Companies
 *  add as many as they like; `id` is the anchor nav links point at. */
export interface HomepageSection {
  id: string;
  heading: string;
  show: boolean;
  cards: HomepageCard[];
}

export interface HomepageNavItem {
  label: string;
  /** "#section-id" for a block on this page, or a full URL. */
  href: string;
  show: boolean;
}

export interface HomepageContent {
  /** Company name shown in the header and footer. NOT stored here: it is read
   *  from `organization_settings.name` so there is one place to change it. */
  brandName: string;
  /** Logo shown in the header and footer. Also not stored here — comes from
   *  `organization_settings.logoUrl`, the same one the sign-in screen uses, and
   *  falls back to /logo.svg. */
  logoUrl: string;
  /** Header and footer links. Any item can be hidden without deleting it. */
  nav: HomepageNavItem[];
  hero: {
    /** Rotating words in the first headline line. */
    titleWords: string[];
    /** Fixed tail of the first line, e.g. "in one place." */
    titleTail: string;
    /** Rotating words in the second (muted) headline line. */
    subtitleWords: string[];
    /** Fixed tail of the second line. */
    subtitleTail: string;
    intro: string;
    /** The yellow sticky note beside the headline. Blank hides it. */
    note: string;
    /** Small line under the buttons. Blank hides it. */
    footnote: string;
    /** Label of the second button. Blank hides that button. */
    secondaryLabel: string;
    /** Where the second button goes. */
    secondaryHref: string;
  };
  /** Company information blocks, rendered in order. */
  sections: HomepageSection[];
  contact: {
    show: boolean;
    heading: string;
    body: string;
    /** Any of these may be blank; blank rows are not rendered. */
    email: string;
    phone: string;
    address: string;
    hours: string;
  };
  footerNote: string;
}

export const DEFAULT_HOMEPAGE: HomepageContent = {
  /* both filled in by mergeHomepage from organization settings */
  brandName: "Workseed",
  logoUrl: "/logo.svg",
  nav: [
    { label: "About", href: "#about", show: true },
    { label: "Contact", href: "#contact", show: true },
  ],
  hero: {
    titleWords: ["Attendance", "Leave", "Requests"],
    titleTail: "in one place.",
    subtitleWords: ["One", "Every"],
    subtitleTail: "record per employee.",
    intro:
      "The company workspace for our team — sign in to check in, request time off and find a colleague.",
    note: "Everything about a person in one place — profile, team, attendance, leave and the laptop they were handed.",
    footnote: "Sign in with the account HR created for you.",
    secondaryLabel: "About us",
    secondaryHref: "#about",
  },
  sections: [
    {
      id: "about",
      heading: "About the company",
      show: true,
      cards: [
        {
          title: "Who we are",
          body: "A short line about the company — what it does and who it serves.",
        },
        { title: "Where we are", body: "Our offices and the teams based at each one." },
        { title: "How we work", body: "Working days, hours, and how time off is handled." },
      ],
    },
  ],
  contact: {
    show: true,
    heading: "Need help getting in?",
    body: "Ask HR or your admin for an account, or if your details need correcting.",
    email: "",
    phone: "",
    address: "",
    hours: "",
  },
  footerNote: "",
};

/** Anchor-safe id: lowercase, dashes, no punctuation. */
export function sectionSlug(value: string, fallback = "section"): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

/** Shapes written by earlier versions of this editor — read, never written. */
interface LegacyShape {
  about?: { show?: boolean; heading?: string; cards?: HomepageCard[] };
  /** Was editable here before the name moved to Settings → Organization. */
  brandName?: string;
}

function readSections(stored: Partial<HomepageContent> & LegacyShape): HomepageSection[] {
  const legacy = stored.about;
  const fallback: HomepageSection[] = legacy
    ? [
        {
          id: "about",
          heading: legacy.heading ?? DEFAULT_HOMEPAGE.sections[0].heading,
          show: legacy.show ?? true,
          cards: (legacy.cards ?? []).filter((c) => c?.title || c?.body),
        },
      ]
    : [];

  const sections = (stored.sections ?? fallback)
    .filter((s) => s?.heading || s?.cards?.length)
    .map((s, i) => ({
      id: sectionSlug(s.id || s.heading || "", `section-${i + 1}`),
      heading: s.heading ?? "",
      show: s.show ?? true,
      cards: (s.cards ?? []).filter((c) => c?.title || c?.body),
    }));

  return sections.length ? sections : DEFAULT_HOMEPAGE.sections;
}

/** Merges stored config over the defaults, one level into each section. */
export function mergeHomepage(
  stored: unknown,
  orgName: string,
  orgLogoUrl?: string | null
): HomepageContent {
  const s = (stored ?? {}) as Partial<HomepageContent> & LegacyShape;
  const d = DEFAULT_HOMEPAGE;
  const nav = s.nav?.filter((n) => n?.label && n?.href);
  return {
    /* name and logo are organization settings, never part of the stored page
       config — any brandName left by an older save is ignored */
    brandName: orgName.trim() || d.brandName,
    logoUrl: orgLogoUrl?.trim() || d.logoUrl,
    nav: nav ?? d.nav,
    hero: { ...d.hero, ...(s.hero ?? {}) },
    sections: readSections(s),
    contact: { ...d.contact, ...(s.contact ?? {}) },
    footerNote: s.footerNote ?? d.footerNote,
  };
}

import type { Metadata } from "next";
import { DM_Mono, Figtree } from "next/font/google";
import { Landing } from "@/components/landing/Landing";
import { getHomepageContent } from "@/lib/homepage-server";

/* Display + body: Figtree · Data/labels: DM Mono. Exposed as CSS variables and
   consumed by landing.css, so the home page keeps its own typography without
   touching the Inter used inside the app. */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  variable: "--font-figtree",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

/* Content is admin-editable, so the page is rendered per request rather than
   baked at build time. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getHomepageContent();
  return {
    title: content.brandName,
    description: content.hero.intro,
  };
}

export default async function Home() {
  const content = await getHomepageContent();

  return (
    <div className={`${figtree.variable} ${dmMono.variable}`}>
      <Landing content={content} />
    </div>
  );
}

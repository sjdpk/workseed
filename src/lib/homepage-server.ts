/** Database read for the public home page. Server-only — imports Prisma. */
import { type HomepageContent, mergeHomepage } from "./homepage";
import { prisma } from "./prisma";

/** Hidden nav links and hidden blocks are dropped here rather than in the page
 *  components, so unpublished copy never reaches the browser at all. */
function publicOnly(content: HomepageContent): HomepageContent {
  return {
    ...content,
    nav: content.nav.filter((n) => n.show),
    sections: content.sections.filter((s) => s.show && s.cards.length),
  };
}

/** Never throws: a database that is not reachable yet must still render the
 *  default page rather than a 500. */
export async function getHomepageContent(): Promise<HomepageContent> {
  try {
    const settings = await prisma.organizationSettings.findFirst({
      select: { name: true, logoUrl: true, homepage: true },
    });
    return publicOnly(mergeHomepage(settings?.homepage, settings?.name ?? "", settings?.logoUrl));
  } catch {
    return publicOnly(mergeHomepage(null, ""));
  }
}

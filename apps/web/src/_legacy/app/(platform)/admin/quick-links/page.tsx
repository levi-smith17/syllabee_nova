import { db } from "@/lib/db";
import { QuickLinksManager } from "./quick-links-manager";

export const metadata = { title: "Quick Links — Syllabee Admin" };

export default async function QuickLinksPage() {
  const links = await db.quickLink.findMany({ orderBy: { label: "asc" } });

  return (
    <QuickLinksManager
      initialLinks={links.map((l) => ({
        id: l.id,
        label: l.label,
        url: l.url,
        icon: l.icon ?? "",
        restricted: l.restricted,
      }))}
    />
  );
}

import { db } from "@/lib/db";
import { TermsManager } from "./terms-manager";

export const metadata = { title: "Terms — Syllabee Admin" };

type TermRow = {
  id: string; name: string; code: string;
  startDate: Date; endDate: Date; isActive: boolean; termLengthId: string | null;
};

export default async function TermsPage() {
  const [terms, termLengths] = await Promise.all([
    db.term.findMany({ orderBy: { startDate: "desc" } }) as Promise<TermRow[]>,
    db.termLength.findMany({ orderBy: { weeks: "asc" } }),
  ]);

  return (
    <TermsManager
      initialTerms={terms.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        isActive: t.isActive,
        termLengthId: t.termLengthId ?? null,
      }))}
      termLengths={termLengths.map((tl) => ({ id: tl.id, label: tl.label, weeks: tl.weeks }))}
    />
  );
}

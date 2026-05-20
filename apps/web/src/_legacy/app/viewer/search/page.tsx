import { db } from "@/lib/db";
import { SearchForm } from "./search-form";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export const metadata = { title: "Search Syllabi — Syllabee" };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";

  const results = query
    ? await db.section.findMany({
        where: {
          isActive: true,
          OR: [
            { course: { title: { contains: query, mode: "insensitive" } } },
            { course: { code: { contains: query, mode: "insensitive" } } },
          ],
        },
        include: {
          course: true,
          term: true,
        },
        take: 30,
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-6">Search Syllabi</h1>
        <SearchForm initialQuery={query} />
        {query && (
          <div className="mt-6">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <div className="divide-y rounded-xl border">
                {results.map((section) => (
                  <a
                    key={section.id}
                    href={`/viewer/s/${section.hash}`}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{section.course.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {section.course.code} · {section.term.name}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

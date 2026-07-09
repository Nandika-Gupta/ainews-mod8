import { NextRequest, NextResponse } from "next/server";
import { queryArticles } from "@/lib/api/queryArticles";

/**
 * GET /api/news — paginated, sortable, filterable article listing.
 *
 * Query params:
 *   page            default 1
 *   perPage         default 20, max 100
 *   sort            "date" | "title" | "trending" (default "date")
 *   dir             "asc" | "desc" (default "desc")
 *   category        exact category key match
 *   topic           exact topic name match
 *   publisherDomain exact publisher domain match
 *   search          case-insensitive match against title/dek/publisher name
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const sortParam = sp.get("sort");
  const sort = sortParam === "title" || sortParam === "trending" ? sortParam : "date";
  const dirParam = sp.get("dir");
  const dir = dirParam === "asc" ? "asc" : "desc";

  const result = await queryArticles({
    page: sp.has("page") ? Number(sp.get("page")) : undefined,
    perPage: sp.has("perPage") ? Number(sp.get("perPage")) : undefined,
    sort,
    dir,
    category: sp.get("category") ?? undefined,
    topic: sp.get("topic") ?? undefined,
    publisherDomain: sp.get("publisherDomain") ?? undefined,
    search: sp.get("search") ?? undefined,
  });

  return NextResponse.json(result);
}

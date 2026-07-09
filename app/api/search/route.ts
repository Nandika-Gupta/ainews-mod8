import { NextRequest, NextResponse } from "next/server";
import { queryArticles } from "@/lib/api/queryArticles";

/**
 * GET /api/search?q=... — same underlying query as /api/news with `search`
 * always applied; a dedicated path for search-only consumers. Supports the
 * same page/perPage/sort/dir params as /api/news.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";

  if (!q.trim()) {
    return NextResponse.json({ data: [], meta: { page: 1, perPage: 0, total: 0, totalPages: 0 } });
  }

  const sortParam = sp.get("sort");
  const sort = sortParam === "title" || sortParam === "trending" ? sortParam : "date";
  const dirParam = sp.get("dir");
  const dir = dirParam === "asc" ? "asc" : "desc";

  const result = await queryArticles({
    page: sp.has("page") ? Number(sp.get("page")) : undefined,
    perPage: sp.has("perPage") ? Number(sp.get("perPage")) : undefined,
    sort,
    dir,
    search: q,
  });

  return NextResponse.json(result);
}

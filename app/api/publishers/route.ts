import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializePublisher } from "@/lib/api/serialize";

/**
 * GET /api/publishers — every known publisher, with a live article count.
 * Sorted by article count desc by default (i.e. "most active" first);
 * pass ?sort=name for alphabetical.
 */
export async function GET(req: NextRequest) {
  const sort = req.nextUrl.searchParams.get("sort");

  const publishers = await prisma.publisher.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: sort === "name" ? { name: "asc" } : { articles: { _count: "desc" } },
  });

  return NextResponse.json({
    data: publishers.map((p) => ({ ...serializePublisher(p), articleCount: p._count.articles })),
  });
}

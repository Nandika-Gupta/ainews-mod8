import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/topics — every topic with its article count, most-used first. */
export async function GET() {
  const topics = await prisma.topic.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: { articles: { _count: "desc" } },
  });

  return NextResponse.json({
    data: topics.map((t) => ({ name: t.name, articleCount: t._count.articles })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeArticle } from "@/lib/api/serialize";

/** GET /api/news/:slug — a single article by its URL slug. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const article = await prisma.newsArticle.findUnique({
    where: { slug },
    include: { publisher: true, topics: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  return NextResponse.json({ data: serializeArticle(article) });
}

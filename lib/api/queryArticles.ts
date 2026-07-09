import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { serializeArticle } from "./serialize";

export interface ArticleQueryParams {
  page?: number;
  perPage?: number;
  sort?: "date" | "title" | "trending";
  dir?: "asc" | "desc";
  category?: string;
  topic?: string;
  publisherDomain?: string;
  search?: string;
}

const ARTICLE_INCLUDE = { publisher: true, topics: true } satisfies Prisma.NewsArticleInclude;

function buildOrderBy(sort: ArticleQueryParams["sort"], dir: "asc" | "desc"): Prisma.NewsArticleOrderByWithRelationInput {
  if (sort === "title") return { title: dir };
  if (sort === "trending") return { upvotes: dir };
  return { publishedAt: dir };
}

export async function queryArticles(params: ArticleQueryParams) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const dir = params.dir ?? "desc";

  const where: Prisma.NewsArticleWhereInput = {
    ...(params.category ? { category: params.category } : {}),
    ...(params.topic ? { topics: { some: { name: params.topic } } } : {}),
    ...(params.publisherDomain ? { publisher: { domain: params.publisherDomain } } : {}),
    ...(params.search
      ? {
          OR: [
            { title: { contains: params.search, mode: "insensitive" } },
            { dek: { contains: params.search, mode: "insensitive" } },
            { publisher: { name: { contains: params.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.newsArticle.count({ where }),
    prisma.newsArticle.findMany({
      where,
      include: ARTICLE_INCLUDE,
      orderBy: buildOrderBy(params.sort, dir),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return {
    data: rows.map(serializeArticle),
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  };
}

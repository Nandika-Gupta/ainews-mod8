"use client";

import { useEffect } from "react";
import { PageShell } from "@/components/news/PageShell";
import { ErrorState } from "@/components/news/ErrorState";

export default function ArticleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <ErrorState onRetry={reset} title="Couldn't load this story" body="Something went wrong fetching this article. Check your connection and try again." />
    </PageShell>
  );
}

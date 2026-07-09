"use client";

import { useEffect } from "react";
import { PageShell } from "@/components/news/PageShell";
import { ErrorState } from "@/components/news/ErrorState";

export default function NewsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <ErrorState onRetry={reset} />
    </PageShell>
  );
}

"use client";

import { StateShell } from "./StateShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";

interface ErrorStateProps {
  onRetry: () => void;
  title?: string;
  body?: string;
}

export function ErrorState({
  onRetry,
  title = "Couldn't load the feed",
  body = "Something went wrong fetching the latest news. Check your connection and try again.",
}: ErrorStateProps) {
  return (
    <StateShell
      icon={ICONS.alert}
      title={title}
      body={body}
      action={
        <Button variant="secondary" size="md" iconLeft={<Icon path={ICONS.refresh} size={16} />} onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}

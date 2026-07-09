import { StateShell } from "./StateShell";
import { ICONS } from "@/lib/icons";

export function NoResultsState() {
  return (
    <StateShell
      icon={ICONS.search}
      title="No results"
      body="No stories match your search and filters. Try different keywords or clear the column filters."
    />
  );
}

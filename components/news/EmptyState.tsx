import { StateShell } from "./StateShell";
import { ICONS } from "@/lib/icons";

export function EmptyState() {
  return (
    <StateShell
      icon={ICONS.inbox}
      title="No signals yet"
      body="Nothing to show in this feed right now. Try a broader filter or clear your search."
    />
  );
}

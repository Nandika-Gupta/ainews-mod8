import Link from "next/link";
import { PageShell } from "@/components/news/PageShell";
import { StateShell } from "@/components/news/StateShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/lib/icons";

export default function ArticleNotFoundPage() {
  return (
    <PageShell>
      <StateShell
        icon={ICONS.alert}
        title="Story not found"
        body="This article may have been moved or removed."
        action={
          <Link href="/news">
            <Button variant="secondary" iconLeft={<Icon path={ICONS.chevronL} size={16} />}>
              Back to news
            </Button>
          </Link>
        }
      />
    </PageShell>
  );
}

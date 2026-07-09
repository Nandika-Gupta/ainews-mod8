/**
 * One-shot backfill: finds every Publisher row that doesn't yet have a
 * locally-stored logo (i.e. logoUrl isn't under /logos/) and runs the real
 * Publisher Resolver (logoResolver.ts) against it — fetch the homepage,
 * parse <head> icon links + manifest, download the highest-resolution icon,
 * store it locally, update the row. Safe to re-run: publishers that already
 * have a local logo are skipped.
 *
 * Usage: npm run resolve-logos
 */
import { prisma } from "../lib/prisma";
import { resolvePublisherLogo } from "./logoResolver";

async function main() {
  const publishers = await prisma.publisher.findMany({
    where: { NOT: { logoUrl: { startsWith: "/logos/" } } },
  });

  if (publishers.length === 0) {
    console.log("Every publisher already has a locally-stored logo. Nothing to do.");
    return;
  }

  console.log(`Resolving real logos for ${publishers.length} publisher(s)...\n`);

  let resolved = 0;
  let failed = 0;

  for (const publisher of publishers) {
    const localPath = await resolvePublisherLogo(publisher.domain);
    if (localPath) {
      await prisma.publisher.update({ where: { id: publisher.id }, data: { logoUrl: localPath } });
      console.log(`  ✅ ${publisher.name.padEnd(24)} ${publisher.domain.padEnd(24)} -> ${localPath}`);
      resolved++;
    } else {
      console.log(`  ⚠️  ${publisher.name.padEnd(24)} ${publisher.domain.padEnd(24)} -> could not resolve a real icon, kept existing logoUrl`);
      failed++;
    }
  }

  console.log(`\nDone. ${resolved} resolved, ${failed} left unchanged.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

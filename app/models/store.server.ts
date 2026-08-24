import prisma from "../db.server";

/**
 * Called after a successful OAuth exchange. Installs are not one-shot — a
 * merchant can reinstall after uninstalling — so this upserts and clears any
 * previous `uninstalledAt` marker rather than failing on the unique `shop`.
 */
export async function recordInstall({
  shop,
  scope,
}: {
  shop: string;
  scope?: string;
}) {
  return prisma.store.upsert({
    where: { shop },
    create: { shop, scope },
    update: { scope, uninstalledAt: null },
  });
}

/**
 * Soft-deletes the store on app/uninstalled. The LMS rows are deliberately
 * kept so a merchant who reinstalls gets their courses back; the API refuses
 * requests while `uninstalledAt` is set.
 */
export async function recordUninstall(shop: string) {
  await prisma.store.updateMany({
    where: { shop, uninstalledAt: null },
    data: { uninstalledAt: new Date() },
  });
}

export async function updateStoreScope(shop: string, scope: string) {
  await prisma.store.updateMany({ where: { shop }, data: { scope } });
}

export async function getStoreByShop(shop: string) {
  return prisma.store.findUnique({ where: { shop } });
}

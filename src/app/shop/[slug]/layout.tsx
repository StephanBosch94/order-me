import { ShopFooter } from "@/components/shop/shop-footer";
import { getSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) return children;
  const session = await getSession();
  const kind = session?.kind === "buyer" ? "buyer" : session ? "staff" : "guest";

  return (
    <>
      {children}
      <ShopFooter catalog={catalog} kind={kind} />
    </>
  );
}

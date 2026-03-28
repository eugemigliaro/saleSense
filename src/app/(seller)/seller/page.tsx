import Link from "next/link";

import { countActiveDeviceSessionsByStore } from "@/lib/device-sessions";
import { listLeadsByStore } from "@/lib/leads";
import { listProductsByStore } from "@/lib/products";
import { requireSellerContext } from "@/lib/auth";

import { signOutSellerAction } from "./actions";
import SellerWorkspace from "./SellerWorkspace";

export default async function SellerPage() {
  const sellerContext = await requireSellerContext();
  const [activeDevicesCount, initialProducts, initialLeads] = await Promise.all([
    countActiveDeviceSessionsByStore(sellerContext.storeId),
    listProductsByStore(sellerContext.storeId),
    listLeadsByStore(sellerContext.storeId),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/seller" className="font-display text-xl font-bold text-gradient">
          SaleSense
        </Link>
        <form action={signOutSellerAction}>
          <button
            type="submit"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </header>

      <SellerWorkspace
        activeDevicesCount={activeDevicesCount}
        initialLeads={initialLeads}
        initialProducts={initialProducts}
      />
    </div>
  );
}

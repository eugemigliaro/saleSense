import Link from "next/link";

import { requireSellerContext } from "@/lib/auth";
import { listConversationAnalyticsByStore } from "@/lib/conversationAnalytics";
import { listUndismissedDeviceSessionsByStore } from "@/lib/device-sessions";
import { listLeadsByStore } from "@/lib/leads";
import { listProductsByStore } from "@/lib/products";

import { signOutSellerAction } from "./actions";
import SellerWorkspace from "./SellerWorkspace";

export default async function SellerPage() {
  const sellerContext = await requireSellerContext();
  const [initialProducts, initialLeads, initialDeviceSessions, initialAnalytics] =
    await Promise.all([
      listProductsByStore(sellerContext.storeId),
      listLeadsByStore(sellerContext.storeId),
      listUndismissedDeviceSessionsByStore(sellerContext.storeId),
      listConversationAnalyticsByStore(sellerContext.storeId),
    ]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link
          href="/seller"
          className="font-display ui-text-large font-bold text-gradient"
        >
          SaleSense
        </Link>
        <form action={signOutSellerAction}>
          <button
            type="submit"
            className="ui-text-small text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </header>

      <SellerWorkspace
        initialAnalytics={initialAnalytics}
        initialDeviceSessions={initialDeviceSessions}
        initialLeads={initialLeads}
        initialProducts={initialProducts}
      />
    </div>
  );
}

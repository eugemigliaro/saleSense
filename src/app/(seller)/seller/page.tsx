import { listLeadsByStore } from "@/lib/leads";
import { listProductsByStore } from "@/lib/products";
import { requireSellerContext } from "@/lib/auth";

import SellerWorkspace from "./SellerWorkspace";

export default async function SellerPage() {
  const sellerContext = await requireSellerContext();
  const [initialProducts, initialLeads] = await Promise.all([
    listProductsByStore(sellerContext.storeId),
    listLeadsByStore(sellerContext.storeId),
  ]);

  return (
    <SellerWorkspace
      initialLeads={initialLeads}
      initialProducts={initialProducts}
      sellerEmail={sellerContext.email}
      storeId={sellerContext.storeId}
    />
  );
}

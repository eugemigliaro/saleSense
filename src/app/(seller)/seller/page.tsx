import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { requireSellerContext } from "@/lib/auth";

const sellerTickets = [
  "Protected seller shell and auth flow",
  "Product list, create, and edit screens",
  "Device launch flow for the current product",
  "Lead review table with AI summary fields",
];

export default async function SellerPage() {
  const sellerContext = await requireSellerContext();

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
            Seller Surface
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Seller workspace scaffold
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            This route group is reserved for product management, device launch,
            and lead review. Build here, not in the customer kiosk routes.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Authenticated seller context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">User:</span>{" "}
              {sellerContext.email ?? sellerContext.userId}
            </p>
            <p>
              <span className="font-medium text-foreground">Store scope:</span>{" "}
              {sellerContext.storeId}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reserved work for Dev B</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
              {sellerTickets.map((ticket) => (
                <li key={ticket} className="flex gap-3">
                  <span className="mt-2 size-2 rounded-full bg-foreground/70" />
                  <span>{ticket}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

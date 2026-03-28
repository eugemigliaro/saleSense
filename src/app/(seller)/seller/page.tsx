import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sellerTickets = [
  "Protected seller shell and auth flow",
  "Product list, create, and edit screens",
  "Device launch flow for the current product",
  "Lead review table with AI summary fields",
];

export default function SellerPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10 sm:px-10">
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

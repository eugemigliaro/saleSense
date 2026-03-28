import Link from "next/link";
import {
  ArrowUpRight,
  LayoutDashboard,
  MonitorSmartphone,
  Package,
  Users,
} from "lucide-react";

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
      <div className="flex flex-col gap-8">
        <header className="seller-panel seller-hero rounded-[2rem] p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
            Seller Surface
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Seller workspace, recast into the Lovable dashboard language.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            This route still reserves Dev B ownership for product CRUD, device
            launch, and lead review. What changed here is the visual system:
            lighter glass panels, display typography, and a clear bridge toward
            the customer kiosk experience.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/75 px-4 py-2 text-sm text-foreground">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              Authenticated seller shell
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/75 px-4 py-2 text-sm text-foreground">
              <MonitorSmartphone className="h-4 w-4 text-primary" />
              Kiosk preview ready
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Package,
              label: "Products",
              note: "UI reserved for Dev B",
              value: "API ready",
            },
            {
              icon: MonitorSmartphone,
              label: "Device launches",
              note: "Kiosk preview route available",
              value: "Preview now",
            },
            {
              icon: Users,
              label: "Leads",
              note: "List and create APIs shipped",
              value: "Seller review next",
            },
          ].map((item) => (
            <div key={item.label} className="seller-panel rounded-[1.75rem] p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-display text-2xl font-semibold tracking-tight">
                    {item.value}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {item.note}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="seller-panel rounded-[1.75rem] p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
                  Reserved work for Dev B
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                  Seller roadmap
                </h2>
              </div>
            </div>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-muted-foreground">
              {sellerTickets.map((ticket) => (
                <li key={ticket} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary/75" />
                  <span>{ticket}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <div className="seller-panel rounded-[1.75rem] p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
                Authenticated context
              </p>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">User</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {sellerContext.email ?? sellerContext.userId}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Store scope</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {sellerContext.storeId}
                  </dd>
                </div>
              </dl>
            </div>

            <Link
              href="/kiosk"
              className="seller-panel group block rounded-[1.75rem] p-7 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
                Customer hand-off
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                Preview the kiosk shell
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Review the imported Lovable styling in the customer-facing flow
                before wiring product launch and live sessions into it.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                Open kiosk preview
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

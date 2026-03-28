import Link from "next/link";
import { ArrowRight, MonitorSmartphone, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const bootChecklist = [
  "Next.js App Router + TypeScript + pnpm baseline",
  "Tailwind v4 + shadcn/ui primitives",
  "Shared domain and API types for parallel work",
  "Typed environment helpers and /api/v1 health route",
];

const routes = [
  {
    description: "Protected workspace for products, launches, and captured leads.",
    href: "/seller",
    icon: ShieldCheck,
    label: "Seller workspace",
  },
  {
    description: "Lovable-style customer shell for the in-store sales assistant.",
    href: "/kiosk",
    icon: MonitorSmartphone,
    label: "Customer kiosk",
  },
];

export default function Home() {
  return (
    <main className="seller-shell min-h-screen text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between gap-14 px-6 py-10 sm:px-10 lg:px-14">
        <header className="flex flex-col gap-6 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Lovable-aligned shell
            </span>
            <div>
              <p className="font-display text-3xl font-bold tracking-tight text-gradient sm:text-4xl">
                SaleSense
              </p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Virtual retail salesperson for in-store demo devices. Seller
                tooling stays operational, customer mode stays immersive.
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/70 px-5 py-4 text-sm text-muted-foreground shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
            <p className="font-semibold text-foreground">Health endpoint</p>
            <code className="mt-1 block text-primary">/api/v1/health</code>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="seller-panel rounded-[2rem] p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              Milestone 1 foundation
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[0.94] tracking-[-0.04em] text-balance sm:text-6xl">
              Ready for seller ops, kiosk chat, and clean parallel delivery.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Dev A already moved the shared contracts and APIs forward. This
              shell now carries the imported Lovable visual language across both
              the operational seller routes and the customer-facing kiosk.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-primary px-6 shadow-[0_18px_45px_-22px_rgba(37,99,235,0.85)]"
              >
                <Link href="/seller">
                  Open seller workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-xl border-border/80 bg-white/70 px-6"
              >
                <Link href="/kiosk">Open customer kiosk</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="seller-panel group rounded-[1.75rem] p-6 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <route.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">
                  {route.label}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {route.description}
                </p>
              </Link>
            ))}

            <div className="seller-panel rounded-[1.75rem] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
                Shared contracts
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                {bootChecklist.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const bootChecklist = [
  "Next.js App Router + TypeScript + pnpm baseline",
  "Tailwind v4 + shadcn/ui primitives",
  "Shared domain and API types for parallel work",
  "Typed environment helpers and /api/v1 health route",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f6f3_0%,#f3efe7_48%,#ece4d8_100%)] text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between gap-16 px-6 py-10 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Boot-01 Ready
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              SaleSense
            </h1>
          </div>
          <p className="max-w-xs text-right text-sm text-muted-foreground">
            Virtual retail salesperson for in-store demo devices.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Milestone 1 Foundation
            </p>
            <h2 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-tight text-balance sm:text-6xl">
              Scaffolded for typed chat, seller tooling, and clean parallel
              development.
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              This repo is now prepared for Dev B to own the seller surface and
              Dev C to own the customer kiosk while Dev A builds data, auth, and
              API foundations.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/seller">Open Seller Route</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full bg-transparent px-8"
              >
                <Link href="/kiosk">Open Customer Route</Link>
              </Button>
            </div>
          </div>

          <Card className="border-black/10 bg-white/80 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base tracking-tight">
                Boot Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                {bootChecklist.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 size-2 rounded-full bg-foreground/80" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl border border-black/10 bg-black px-4 py-3 text-sm text-white">
                <span className="font-medium">Health endpoint:</span>{" "}
                <code>/api/v1/health</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

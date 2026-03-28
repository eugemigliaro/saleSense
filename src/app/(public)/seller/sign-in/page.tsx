import type { Metadata } from "next";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signInSellerAction } from "./actions";

export const metadata: Metadata = {
  title: "Seller Sign In",
};

interface SellerSignInPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
}

export default async function SellerSignInPage({
  searchParams,
}: SellerSignInPageProps) {
  const { error, message, next } = await searchParams;
  const nextPath = next?.startsWith("/") ? next : "/seller";

  return (
    <main className="seller-shell min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(26rem,0.95fr)] lg:items-center">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Seller access
            </div>

            <div className="space-y-5">
              <p className="font-display text-4xl font-bold tracking-tight text-gradient sm:text-5xl">
                SaleSense
              </p>
              <h1 className="max-w-2xl font-display text-5xl font-bold leading-[0.95] tracking-[-0.04em] text-balance sm:text-6xl">
                Sign in with a store-scoped manager account.
              </h1>
              <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                This entrypoint protects product setup, device launch, and lead
                review. The visual language now matches the imported Lovable
                dashboard direction while keeping the existing auth flow intact.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Operational seller tooling with clear product and lead surfaces",
                "Customer kiosk preview that shares the same product story",
              ].map((item) => (
                <div key={item} className="seller-panel rounded-[1.5rem] p-5">
                  <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="seller-panel rounded-[2rem] p-7 sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
                Email and password
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
                Store manager login
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use the manager account linked to your Supabase project and
                store scope.
              </p>
            </div>

            {message ? (
              <div className="mb-5 rounded-2xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <form action={signInSellerAction} className="space-y-5">
              <input type="hidden" name="next" value={nextPath} />
              <div className="space-y-2">
                <Label htmlFor="email">Manager email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoComplete="email"
                    id="email"
                    name="email"
                    placeholder="manager@store.com"
                    required
                    type="email"
                    className="h-12 rounded-xl border-border/80 bg-white/75 pl-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoComplete="current-password"
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                    type="password"
                    className="h-12 rounded-xl border-border/80 bg-white/75 pl-11"
                  />
                </div>
              </div>

              <Button
                className="h-12 w-full rounded-xl bg-primary shadow-[0_18px_45px_-24px_rgba(37,99,235,0.85)]"
                type="submit"
              >
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 rounded-[1.5rem] border border-primary/12 bg-primary/6 px-4 py-4 text-sm leading-6 text-muted-foreground">
              Seller routes stay protected. Customer kiosk routes remain
              separate so the operational and immersive surfaces do not bleed
              into each other.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

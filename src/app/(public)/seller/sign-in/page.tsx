import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4efe7_0%,#ece6dc_45%,#ddd6cb_100%)] px-6 py-10 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <div className="grid w-full gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Seller Access
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] tracking-tight text-balance sm:text-6xl">
              Sign in with a store-scoped manager account.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              This entrypoint protects product management, device launch, and
              lead review. Use the same Supabase project that will back seller
              data and store-level access.
            </p>
          </div>

          <Card className="border-black/10 bg-white/85 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl tracking-tight">
                Email and password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {message ? (
                <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {message}
                </div>
              ) : null}
              {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <form action={signInSellerAction} className="space-y-4">
                <input type="hidden" name="next" value={nextPath} />
                <div className="space-y-2">
                  <Label htmlFor="email">Manager email</Label>
                  <Input
                    autoComplete="email"
                    id="email"
                    name="email"
                    placeholder="manager@store.com"
                    required
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    autoComplete="current-password"
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                    type="password"
                  />
                </div>
                <Button className="w-full" type="submit">
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

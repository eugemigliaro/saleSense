import type { Metadata } from "next";
import { ArrowRight, Lock, Mail } from "lucide-react";

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
    <main className="min-h-screen bg-background px-4">
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-gradient font-display ui-text-large font-bold">
              SaleSense
            </h1>
            <p className="mt-2 ui-text-small text-muted-foreground">
              Store manager login
            </p>
          </div>

          {message ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 ui-text-small text-emerald-900">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 ui-text-small text-destructive">
              {error}
            </div>
          ) : null}

          <form action={signInSellerAction} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-input bg-background px-10 py-3 ui-text-small focus:outline-none focus:ring-2 focus:ring-primary/50"
                id="email"
                name="email"
                placeholder="Email"
                required
                type="email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoComplete="current-password"
                className="w-full rounded-xl border border-input bg-background px-10 py-3 ui-text-small focus:outline-none focus:ring-2 focus:ring-primary/50"
                id="password"
                name="password"
                placeholder="Password"
                required
                type="password"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

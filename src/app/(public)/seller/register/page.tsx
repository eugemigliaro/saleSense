import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Lock, Mail } from "lucide-react";

import { registerSellerAction } from "../sign-in/actions";

export const metadata: Metadata = {
  title: "Seller Register",
};

interface SellerRegisterPageProps {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
}

export default async function SellerRegisterPage({
  searchParams,
}: SellerRegisterPageProps) {
  const { error, next } = await searchParams;
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
              Create a store manager account
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 ui-text-small text-destructive">
              {error}
            </div>
          ) : null}

          <form action={registerSellerAction} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />

            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoComplete="organization"
                className="w-full rounded-xl border border-input bg-background px-10 py-3 ui-text-small focus:outline-none focus:ring-2 focus:ring-primary/50"
                id="storeName"
                name="storeName"
                placeholder="Store name"
                required
                type="text"
              />
            </div>

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
                autoComplete="new-password"
                className="w-full rounded-xl border border-input bg-background px-10 py-3 ui-text-small focus:outline-none focus:ring-2 focus:ring-primary/50"
                id="password"
                name="password"
                minLength={8}
                placeholder="Password"
                required
                type="password"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoComplete="new-password"
                className="w-full rounded-xl border border-input bg-background px-10 py-3 ui-text-small focus:outline-none focus:ring-2 focus:ring-primary/50"
                id="confirmPassword"
                name="confirmPassword"
                minLength={8}
                placeholder="Confirm password"
                required
                type="password"
              />
            </div>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              type="submit"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-center ui-text-small text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="font-semibold text-primary transition-opacity hover:opacity-80"
              href={`/seller/sign-in?next=${encodeURIComponent(nextPath)}`}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

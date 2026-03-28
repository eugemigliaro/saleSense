import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { requireSellerContext } from "@/lib/auth";

import { signOutSellerAction } from "./actions";

interface SellerLayoutProps {
  children: ReactNode;
}

export default async function SellerLayout({ children }: SellerLayoutProps) {
  const sellerContext = await requireSellerContext();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-black/10 bg-background/90 px-6 py-4 backdrop-blur sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Seller Session
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">
              Store {sellerContext.storeId}
            </h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {sellerContext.email ?? "manager account"}
            </p>
          </div>
          <form action={signOutSellerAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}

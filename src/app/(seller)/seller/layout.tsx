import type { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, MonitorSmartphone, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireSellerContext } from "@/lib/auth";

import { signOutSellerAction } from "./actions";

interface SellerLayoutProps {
  children: ReactNode;
}

export default async function SellerLayout({ children }: SellerLayoutProps) {
  const sellerContext = await requireSellerContext();

  return (
    <div className="seller-shell min-h-screen">
      <header className="border-b border-border/70 bg-white/70 px-6 py-5 backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link href="/" className="space-y-1">
              <p className="font-display text-2xl font-bold tracking-tight text-gradient">
                SaleSense
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Seller workspace
              </p>
            </Link>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/80 px-4 py-2 text-sm text-foreground shadow-[0_18px_35px_-28px_rgba(15,23,42,0.65)]">
                <Store className="h-4 w-4 text-primary" />
                <span className="font-medium">Store {sellerContext.storeId}</span>
              </div>
              <Link
                href="/kiosk"
                className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/12"
              >
                <MonitorSmartphone className="h-4 w-4" />
                Preview kiosk
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/80 px-4 py-2 text-sm text-muted-foreground">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                <span>Operational surface</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              Signed in as {sellerContext.email ?? "manager account"}
            </p>
            <form action={signOutSellerAction}>
              <Button
                type="submit"
                variant="outline"
                className="rounded-xl border-border/80 bg-white/75"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}

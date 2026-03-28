import type { ReactNode } from "react";

import { requireSellerContext } from "@/lib/auth";

interface SellerLayoutProps {
  children: ReactNode;
}

export default async function SellerLayout({ children }: SellerLayoutProps) {
  await requireSellerContext();

  return <div className="min-h-screen bg-background">{children}</div>;
}

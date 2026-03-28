import { redirect } from "next/navigation";

import { getSellerContext } from "@/lib/auth";
import { LandingPage } from "./LandingPage";

export default async function HomePage() {
  const sellerContext = await getSellerContext();

  if (sellerContext) {
    redirect("/seller");
  }

  return <LandingPage />;
}

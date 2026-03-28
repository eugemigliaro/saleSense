import { redirect } from "next/navigation";

import { getSellerContext } from "@/lib/auth";

export default async function HomePage() {
  const sellerContext = await getSellerContext();

  redirect(sellerContext ? "/seller" : "/seller/sign-in");
}

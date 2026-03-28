import { notFound } from "next/navigation";

import { requireSellerContext } from "@/lib/auth";
import { getProductById } from "@/lib/products";

import { ProductFormWorkspace } from "../../ProductFormWorkspace";

interface EditProductPageProps {
  params: Promise<{
    productId: string;
  }>;
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const sellerContext = await requireSellerContext();
  const { productId } = await params;
  const product = await getProductById(productId);

  if (!product || product.storeId !== sellerContext.storeId) {
    notFound();
  }

  return <ProductFormWorkspace initialProduct={product} />;
}

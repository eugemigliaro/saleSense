import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";
import type { Lead, Product } from "@/types/domain";

import type { ProductFormState } from "./sellerWorkspaceUtils";

async function readApiData<T>(response: Response) {
  if (!response.ok) {
    const errorPayload = (await response.json()) as ApiErrorResponse;
    throw new Error(errorPayload.error.message || "Request failed.");
  }

  const payload = (await response.json()) as ApiSuccessResponse<T>;

  return payload.data;
}

export async function saveProductRequest(
  productForm: ProductFormState,
  editingProductId: string | null,
) {
  const endpoint = editingProductId
    ? `/api/v1/products/${editingProductId}`
    : "/api/v1/products";
  const method = editingProductId ? "PATCH" : "POST";

  return readApiData<Product>(
    await fetch(endpoint, {
      body: JSON.stringify(productForm),
      headers: {
        "content-type": "application/json",
      },
      method,
    }),
  );
}

export async function launchProductRequest(productId: string) {
  return readApiData<{ id: string }>(
    await fetch("/api/v1/device-sessions", {
      body: JSON.stringify({
        productId,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    }),
  );
}

export async function fetchLeadsRequest() {
  return readApiData<Lead[]>(
    await fetch("/api/v1/leads", {
      method: "GET",
    }),
  );
}

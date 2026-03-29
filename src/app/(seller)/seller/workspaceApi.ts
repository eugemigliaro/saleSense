import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  DeviceSessionLaunchPayload,
  ProductImportDraftPayload,
} from "@/types/api";
import type {
  DeviceSession,
  Lead,
  MonitoredDeviceSession,
  Product,
} from "@/types/domain";

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

export async function importProductDraftRequest(sourceUrls: string[]) {
  return readApiData<ProductImportDraftPayload>(
    await fetch("/api/v1/product-import-drafts", {
      body: JSON.stringify({
        sourceUrls,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    }),
  );
}

export async function launchProductRequest(productId: string, label?: string) {
  return readApiData<DeviceSessionLaunchPayload>(
    await fetch("/api/v1/device-sessions", {
      body: JSON.stringify({
        ...(label ? { label } : {}),
        productId,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    }),
  );
}

export async function fetchDeviceSessionsRequest(productId?: string) {
  const query = productId ? `?productId=${encodeURIComponent(productId)}` : "";

  return readApiData<MonitoredDeviceSession[]>(
    await fetch(`/api/v1/device-sessions${query}`, {
      method: "GET",
    }),
  );
}

export async function dismissDeviceSessionRequest(deviceSessionId: string) {
  return readApiData<{ session: DeviceSession }>(
    await fetch(`/api/v1/device-sessions/${deviceSessionId}/dismiss`, {
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

export async function updateLeadSaleConfirmationRequest(
  leadId: string,
  isSaleConfirmed: boolean,
) {
  return readApiData<Lead>(
    await fetch(`/api/v1/leads/${leadId}`, {
      body: JSON.stringify({
        isSaleConfirmed,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    }),
  );
}

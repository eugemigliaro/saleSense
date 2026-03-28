import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSellerContext } from "@/lib/auth";
import { updateProductForStore } from "@/lib/products";

import { PATCH } from "./route";

vi.mock("@/lib/auth", () => ({
  getSellerContext: vi.fn(),
}));

vi.mock("@/lib/products", () => ({
  updateProductForStore: vi.fn(),
}));

const mockGetSellerContext = vi.mocked(getSellerContext);
const mockUpdateProductForStore = vi.mocked(updateProductForStore);

describe("/api/v1/products/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the product is outside the seller scope", async () => {
    mockGetSellerContext.mockResolvedValue({
      email: "manager@store.test",
      storeId: "store-1",
      userId: "seller-1",
    });
    mockUpdateProductForStore.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/v1/products/11111111-1111-4111-8111-111111111111", {
        body: JSON.stringify({
          name: "Updated demo name",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }),
      {
        params: Promise.resolve({
          id: "11111111-1111-4111-8111-111111111111",
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Product not found.",
      },
    });
  });
});

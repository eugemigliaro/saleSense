import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSellerContext } from "@/lib/auth";
import {
  createProductForStore,
  listProductsByStore,
} from "@/lib/products";

import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getSellerContext: vi.fn(),
}));

vi.mock("@/lib/products", () => ({
  createProductForStore: vi.fn(),
  listProductsByStore: vi.fn(),
}));

const mockGetSellerContext = vi.mocked(getSellerContext);
const mockCreateProductForStore = vi.mocked(createProductForStore);
const mockListProductsByStore = vi.mocked(listProductsByStore);

describe("/api/v1/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the seller is not authenticated", async () => {
    mockGetSellerContext.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "unauthorized",
        message: "Seller authentication required.",
      },
    });
    expect(mockListProductsByStore).not.toHaveBeenCalled();
  });

  it("creates a product for the seller store", async () => {
    mockGetSellerContext.mockResolvedValue({
      email: "manager@store.test",
      storeId: "store-1",
      userId: "seller-1",
    });
    mockCreateProductForStore.mockResolvedValue({
      brand: "Apple",
      category: "Phone",
      comparisonSnippetMarkdown: "Short comparison snippet.",
      createdAt: "2026-03-28T07:00:00.000Z",
      detailsMarkdown: "Detailed product markdown.",
      id: "11111111-1111-4111-8111-111111111111",
      idleMediaUrl: "https://example.com/idle.mp4",
      name: "iPhone Demo",
      storeId: "store-1",
      updatedAt: "2026-03-28T07:00:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost/api/v1/products", {
        body: JSON.stringify({
          brand: "Apple",
          category: "Phone",
          comparisonSnippetMarkdown: "Short comparison snippet.",
          detailsMarkdown: "Detailed product markdown.",
          idleMediaUrl: "https://example.com/idle.mp4",
          name: "iPhone Demo",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(mockCreateProductForStore).toHaveBeenCalledWith("store-1", {
      brand: "Apple",
      category: "Phone",
      comparisonSnippetMarkdown: "Short comparison snippet.",
      detailsMarkdown: "Detailed product markdown.",
      idleMediaUrl: "https://example.com/idle.mp4",
      name: "iPhone Demo",
    });
  });
});

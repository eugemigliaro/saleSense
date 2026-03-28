import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSellerContext } from "@/lib/auth";
import {
  createLeadForProduct,
  listLeadsByStore,
} from "@/lib/leads";

import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getSellerContext: vi.fn(),
}));

vi.mock("@/lib/leads", () => ({
  createLeadForProduct: vi.fn(),
  listLeadsByStore: vi.fn(),
}));

const mockGetSellerContext = vi.mocked(getSellerContext);
const mockCreateLeadForProduct = vi.mocked(createLeadForProduct);
const mockListLeadsByStore = vi.mocked(listLeadsByStore);

describe("/api/v1/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for seller lead listing without auth", async () => {
    mockGetSellerContext.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "unauthorized",
        message: "Seller authentication required.",
      },
    });
    expect(mockListLeadsByStore).not.toHaveBeenCalled();
  });

  it("returns 404 when the lead references a missing product", async () => {
    mockCreateLeadForProduct.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/v1/leads", {
        body: JSON.stringify({
          customerEmail: "prospect@example.com",
          customerName: "Prospect Buyer",
          productId: "11111111-1111-4111-8111-111111111111",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
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

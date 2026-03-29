import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSellerContext } from "@/lib/auth";
import { updateLeadSaleConfirmationForStore } from "@/lib/leads";

import { PATCH } from "./route";

vi.mock("@/lib/auth", () => ({
  getSellerContext: vi.fn(),
}));

vi.mock("@/lib/leads", () => ({
  updateLeadSaleConfirmationForStore: vi.fn(),
}));

const mockGetSellerContext = vi.mocked(getSellerContext);
const mockUpdateLeadSaleConfirmationForStore = vi.mocked(
  updateLeadSaleConfirmationForStore,
);

describe("/api/v1/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without seller auth", async () => {
    mockGetSellerContext.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/v1/leads/11111111-1111-4111-8111-111111111111", {
        body: JSON.stringify({
          isSaleConfirmed: true,
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

    expect(response.status).toBe(401);
    expect(mockUpdateLeadSaleConfirmationForStore).not.toHaveBeenCalled();
  });

  it("returns 404 when the lead is outside the seller scope", async () => {
    mockGetSellerContext.mockResolvedValue({
      email: "manager@store.test",
      storeId: "store-1",
      userId: "seller-1",
    });
    mockUpdateLeadSaleConfirmationForStore.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/v1/leads/11111111-1111-4111-8111-111111111111", {
        body: JSON.stringify({
          isSaleConfirmed: true,
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
        message: "Lead not found.",
      },
    });
  });

  it("updates lead sale confirmation for the signed-in seller store", async () => {
    mockGetSellerContext.mockResolvedValue({
      email: "manager@store.test",
      storeId: "store-1",
      userId: "seller-1",
    });
    mockUpdateLeadSaleConfirmationForStore.mockResolvedValue({
      aiSummary: "Customer wanted better battery life.",
      chatSessionId: "22222222-2222-4222-8222-222222222222",
      createdAt: "2026-03-28T08:30:00.000Z",
      customerEmail: "prospect@example.com",
      customerName: "Prospect Buyer",
      customerPhone: null,
      id: "11111111-1111-4111-8111-111111111111",
      inferredInterest: "battery life",
      isSaleConfirmed: true,
      nextBestProduct: null,
      productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      storeId: "store-1",
    });

    const response = await PATCH(
      new Request("http://localhost/api/v1/leads/11111111-1111-4111-8111-111111111111", {
        body: JSON.stringify({
          isSaleConfirmed: true,
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

    expect(response.status).toBe(200);
    expect(mockUpdateLeadSaleConfirmationForStore).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "store-1",
      {
        isSaleConfirmed: true,
      },
    );
  });
});

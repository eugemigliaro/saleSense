import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSellerContext } from "@/lib/auth";
import { createDeviceSessionForStore } from "@/lib/device-sessions";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getSellerContext: vi.fn(),
}));

vi.mock("@/lib/device-sessions", () => ({
  createDeviceSessionForStore: vi.fn(),
}));

const mockGetSellerContext = vi.mocked(getSellerContext);
const mockCreateDeviceSessionForStore = vi.mocked(createDeviceSessionForStore);

describe("/api/v1/device-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the seller is not authenticated", async () => {
    mockGetSellerContext.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/v1/device-sessions", {
        body: JSON.stringify({
          productId: "11111111-1111-4111-8111-111111111111",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(mockCreateDeviceSessionForStore).not.toHaveBeenCalled();
  });

  it("creates a device session for the seller store", async () => {
    mockGetSellerContext.mockResolvedValue({
      email: "manager@store.test",
      storeId: "store-1",
      userId: "seller-1",
    });
    mockCreateDeviceSessionForStore.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      lastActivityAt: "2026-03-28T08:20:00.000Z",
      launchedByManagerId: "seller-1",
      productId: "11111111-1111-4111-8111-111111111111",
      startedAt: "2026-03-28T08:20:00.000Z",
      state: "idle",
      storeId: "store-1",
    });

    const response = await POST(
      new Request("http://localhost/api/v1/device-sessions", {
        body: JSON.stringify({
          productId: "11111111-1111-4111-8111-111111111111",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("Location")).toBe(
      "/api/v1/device-sessions/22222222-2222-4222-8222-222222222222",
    );
    expect(mockCreateDeviceSessionForStore).toHaveBeenCalledWith(
      "store-1",
      "seller-1",
      "11111111-1111-4111-8111-111111111111",
    );
  });
});

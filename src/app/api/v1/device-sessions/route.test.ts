import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSellerContext } from "@/lib/auth";
import {
  createDeviceSessionForStore,
  listUndismissedDeviceSessionsByStore,
} from "@/lib/device-sessions";
import {
  issueKioskAccessForDeviceSession,
  setKioskAccessCookie,
} from "@/lib/kiosk-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { GET, POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getSellerContext: vi.fn(),
}));

vi.mock("@/lib/device-sessions", () => ({
  createDeviceSessionForStore: vi.fn(),
  listUndismissedDeviceSessionsByStore: vi.fn(),
}));

vi.mock("@/lib/kiosk-auth", () => ({
  issueKioskAccessForDeviceSession: vi.fn(),
  setKioskAccessCookie: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const mockGetSellerContext = vi.mocked(getSellerContext);
const mockCreateDeviceSessionForStore = vi.mocked(createDeviceSessionForStore);
const mockListUndismissedDeviceSessionsByStore = vi.mocked(
  listUndismissedDeviceSessionsByStore,
);
const mockIssueKioskAccessForDeviceSession = vi.mocked(
  issueKioskAccessForDeviceSession,
);
const mockSetKioskAccessCookie = vi.mocked(setKioskAccessCookie);
const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient);

describe("/api/v1/device-sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
    mockIssueKioskAccessForDeviceSession.mockResolvedValue({
      deviceSessionId: "22222222-2222-4222-8222-222222222222",
      kioskToken: "kiosk-token",
    });
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

  it("creates a device session, signs the seller out, and returns the kiosk url", async () => {
    mockGetSellerContext.mockResolvedValue({
      email: "manager@store.test",
      storeId: "store-1",
      userId: "seller-1",
    });
    mockCreateDeviceSessionForStore.mockResolvedValue({
      claimedAt: null,
      dismissedAt: null,
      id: "22222222-2222-4222-8222-222222222222",
      label: "Front table",
      lastActivityAt: "2026-03-28T08:20:00.000Z",
      lastPresenceAt: null,
      launchedByManagerId: "seller-1",
      productId: "11111111-1111-4111-8111-111111111111",
      startedAt: "2026-03-28T08:20:00.000Z",
      state: "idle",
      storeId: "store-1",
    });

    const response = await POST(
      new Request("http://localhost/api/v1/device-sessions", {
        body: JSON.stringify({
          label: "Front table",
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
      "Front table",
    );
    expect(mockIssueKioskAccessForDeviceSession).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(mockSetKioskAccessCookie).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "kiosk-token",
    );
    await expect(response.json()).resolves.toEqual({
      data: {
        deviceSession: {
          claimedAt: null,
          dismissedAt: null,
          id: "22222222-2222-4222-8222-222222222222",
          label: "Front table",
          lastActivityAt: "2026-03-28T08:20:00.000Z",
          lastPresenceAt: null,
          launchedByManagerId: "seller-1",
          productId: "11111111-1111-4111-8111-111111111111",
          startedAt: "2026-03-28T08:20:00.000Z",
          state: "idle",
          storeId: "store-1",
        },
        kioskUrl: "/kiosk?device=22222222-2222-4222-8222-222222222222",
      },
    });
  });

  it("lists undismissed device sessions for the seller store", async () => {
    mockGetSellerContext.mockResolvedValue({
      email: "manager@store.test",
      storeId: "store-1",
      userId: "seller-1",
    });
    mockListUndismissedDeviceSessionsByStore.mockResolvedValue([
      {
        attentionState: "healthy",
        claimedAt: "2026-03-28T08:20:00.000Z",
        dismissedAt: null,
        id: "22222222-2222-4222-8222-222222222222",
        label: "Front table",
        lastActivityAt: "2026-03-28T08:20:00.000Z",
        lastPresenceAt: "2026-03-28T08:20:00.000Z",
        launchedByManagerId: "seller-1",
        productId: "11111111-1111-4111-8111-111111111111",
        startedAt: "2026-03-28T08:20:00.000Z",
        state: "idle",
        storeId: "store-1",
      },
    ]);

    const response = await GET(
      new Request(
        "http://localhost/api/v1/device-sessions?productId=11111111-1111-4111-8111-111111111111",
      ),
    );

    expect(response.status).toBe(200);
    expect(mockListUndismissedDeviceSessionsByStore).toHaveBeenCalledWith(
      "store-1",
      "11111111-1111-4111-8111-111111111111",
    );
  });
});

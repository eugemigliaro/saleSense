import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDeviceSessionDetailById } from "@/lib/device-sessions";

import { GET } from "./route";

vi.mock("@/lib/device-sessions", () => ({
  getDeviceSessionDetailById: vi.fn(),
}));

const mockGetDeviceSessionDetailById = vi.mocked(getDeviceSessionDetailById);

describe("/api/v1/device-sessions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when the device session does not exist", async () => {
    mockGetDeviceSessionDetailById.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        id: "11111111-1111-4111-8111-111111111111",
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Device session not found.",
      },
    });
  });
});

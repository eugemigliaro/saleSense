import { describe, expect, it } from "vitest";

import { buildChatGreeting } from "@/lib/mock-chat";
import type { Product } from "@/types/domain";

const TEST_PRODUCT: Product = {
  brand: "Apple",
  category: "Phone",
  comparisonSnippetMarkdown:
    "This model is lighter on setup friction than some larger alternatives.",
  createdAt: "2026-03-28T08:20:00.000Z",
  detailsMarkdown:
    "Fast demo device with a bright display and responsive camera controls.",
  id: "11111111-1111-4111-8111-111111111111",
  idleMediaUrl: "https://example.com/idle.mp4",
  name: "iPhone Demo",
  storeId: "store-1",
  updatedAt: "2026-03-28T08:20:00.000Z",
};

describe("buildChatGreeting", () => {
  it("creates an assistant greeting tied to the active product", () => {
    const message = buildChatGreeting(TEST_PRODUCT);

    expect(message.role).toBe("assistant");
    expect(message.content).toContain("Apple iPhone Demo");
  });
});

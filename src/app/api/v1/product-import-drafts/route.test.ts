import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSellerContext } from "@/lib/auth";
import { generateProductImportDraft } from "@/lib/ai/productImport";

import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getSellerContext: vi.fn(),
}));

vi.mock("@/lib/ai/productImport", () => ({
  generateProductImportDraft: vi.fn(),
}));

const mockGetSellerContext = vi.mocked(getSellerContext);
const mockGenerateProductImportDraft = vi.mocked(generateProductImportDraft);

describe("/api/v1/product-import-drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the seller is not authenticated", async () => {
    mockGetSellerContext.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/v1/product-import-drafts", {
        body: JSON.stringify({
          sourceUrls: ["https://example.com/product"],
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(mockGenerateProductImportDraft).not.toHaveBeenCalled();
  });

  it("returns a generated import draft for valid URLs", async () => {
    mockGetSellerContext.mockResolvedValue({
      email: "manager@store.test",
      storeId: "store-1",
      userId: "seller-1",
    });
    mockGenerateProductImportDraft.mockResolvedValue({
      draft: {
        brand: "Apple",
        category: "Phone",
        comparisonSnippetMarkdown: "Best for buyers who want strong video and battery life.",
        detailsMarkdown: "# Summary\nA premium phone demo.",
        idleMediaUrl: "https://example.com/hero.jpg",
        name: "iPhone Demo",
        sourceUrls: ["https://www.apple.com/iphone/"],
      },
      sources: [
        {
          status: "URL_RETRIEVAL_STATUS_SUCCESS",
          url: "https://www.apple.com/iphone/",
        },
      ],
      warnings: [],
    });

    const response = await POST(
      new Request("http://localhost/api/v1/product-import-drafts", {
        body: JSON.stringify({
          sourceUrls: ["https://www.apple.com/iphone/"],
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockGenerateProductImportDraft).toHaveBeenCalledWith([
      "https://www.apple.com/iphone/",
    ]);
    await expect(response.json()).resolves.toEqual({
      data: {
        draft: {
          brand: "Apple",
          category: "Phone",
          comparisonSnippetMarkdown:
            "Best for buyers who want strong video and battery life.",
          detailsMarkdown: "# Summary\nA premium phone demo.",
          idleMediaUrl: "https://example.com/hero.jpg",
          name: "iPhone Demo",
          sourceUrls: ["https://www.apple.com/iphone/"],
        },
        sources: [
          {
            status: "URL_RETRIEVAL_STATUS_SUCCESS",
            url: "https://www.apple.com/iphone/",
          },
        ],
        warnings: [],
      },
    });
  });

  it("returns 422 when no usable source URLs were retrieved", async () => {
    mockGetSellerContext.mockResolvedValue({
      email: "manager@store.test",
      storeId: "store-1",
      userId: "seller-1",
    });
    mockGenerateProductImportDraft.mockResolvedValue({
      draft: {
        brand: "Apple",
        category: "Phone",
        comparisonSnippetMarkdown: "Comparison draft",
        detailsMarkdown: "# Summary\nDraft",
        idleMediaUrl: null,
        name: "iPhone Demo",
        sourceUrls: [],
      },
      sources: [
        {
          status: "URL_RETRIEVAL_STATUS_ERROR",
          url: "https://www.apple.com/iphone/",
        },
      ],
      warnings: ["Could not retrieve https://www.apple.com/iphone/."],
    });

    const response = await POST(
      new Request("http://localhost/api/v1/product-import-drafts", {
        body: JSON.stringify({
          sourceUrls: ["https://www.apple.com/iphone/"],
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "external_retrieval_failed",
        message:
          "Could not retrieve enough public product information from the provided source URLs.",
      },
    });
  });
});

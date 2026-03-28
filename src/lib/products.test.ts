import { describe, expect, it } from "vitest";

import { mapProductRow } from "@/lib/products";
import type { Database } from "@/types/database";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

describe("mapProductRow", () => {
  it("maps a database product row into the domain shape", () => {
    const row: ProductRow = {
      brand: "Apple",
      category: "Phone",
      comparison_snippet_markdown: "Compares well.",
      created_at: "2026-03-28T07:00:00.000Z",
      details_markdown: "Detailed product markdown.",
      id: "11111111-1111-4111-8111-111111111111",
      idle_media_url: "https://example.com/idle.mp4",
      name: "iPhone Demo",
      source_urls: [],
      store_id: "store-1",
      updated_at: "2026-03-28T07:05:00.000Z",
    };

    expect(mapProductRow(row)).toEqual({
      brand: "Apple",
      category: "Phone",
      comparisonSnippetMarkdown: "Compares well.",
      createdAt: "2026-03-28T07:00:00.000Z",
      detailsMarkdown: "Detailed product markdown.",
      id: "11111111-1111-4111-8111-111111111111",
      idleMediaUrl: "https://example.com/idle.mp4",
      name: "iPhone Demo",
      sourceUrls: [],
      storeId: "store-1",
      updatedAt: "2026-03-28T07:05:00.000Z",
    });
  });
});

import { describe, expect, it } from "vitest";

import { mapLeadRow } from "@/lib/leads";
import type { Database } from "@/types/database";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

describe("mapLeadRow", () => {
  it("maps a database lead row into the domain shape", () => {
    const row: LeadRow = {
      ai_summary: null,
      created_at: "2026-03-28T07:15:00.000Z",
      customer_email: "prospect@example.com",
      customer_name: "Prospect Buyer",
      customer_phone: null,
      id: "22222222-2222-4222-8222-222222222222",
      inferred_interest: "Tablet Pro",
      next_best_product: null,
      product_id: "11111111-1111-4111-8111-111111111111",
      store_id: "store-1",
    };

    expect(mapLeadRow(row)).toEqual({
      aiSummary: null,
      createdAt: "2026-03-28T07:15:00.000Z",
      customerEmail: "prospect@example.com",
      customerName: "Prospect Buyer",
      customerPhone: null,
      id: "22222222-2222-4222-8222-222222222222",
      inferredInterest: "Tablet Pro",
      nextBestProduct: null,
      productId: "11111111-1111-4111-8111-111111111111",
      storeId: "store-1",
    });
  });
});

import { describe, expect, it } from "vitest";

import { mapChatMessageRow } from "@/lib/chat-sessions";
import type { Database } from "@/types/database";

type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];

describe("mapChatMessageRow", () => {
  it("maps a database chat message row into the domain shape", () => {
    const row: ChatMessageRow = {
      chat_session_id: "11111111-1111-4111-8111-111111111111",
      content: "Tell me about the battery.",
      created_at: "2026-03-28T09:00:00.000Z",
      id: "22222222-2222-4222-8222-222222222222",
      role: "user",
    };

    expect(mapChatMessageRow(row)).toEqual({
      content: "Tell me about the battery.",
      createdAt: "2026-03-28T09:00:00.000Z",
      id: "22222222-2222-4222-8222-222222222222",
      role: "user",
    });
  });
});

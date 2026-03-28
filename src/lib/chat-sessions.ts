import "server-only";

import { touchDeviceSession } from "@/lib/device-sessions";
import { getProductById } from "@/lib/products";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type {
  ChatMessage,
  ChatMessageRole,
  ChatSession,
  ChatSessionStatus,
  Product,
} from "@/types/domain";

type ChatMessageInsert =
  Database["public"]["Tables"]["chat_messages"]["Insert"];
type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];
type ChatSessionInsert = Database["public"]["Tables"]["chat_sessions"]["Insert"];
type ChatSessionRow = Database["public"]["Tables"]["chat_sessions"]["Row"];

const CHAT_MESSAGE_COLUMNS = [
  "id",
  "chat_session_id",
  "role",
  "content",
  "created_at",
].join(", ");

const CHAT_SESSION_COLUMNS = [
  "id",
  "device_session_id",
  "store_id",
  "product_id",
  "status",
  "started_at",
  "last_activity_at",
].join(", ");

export interface ChatSessionContext {
  product: Product;
  session: ChatSession;
}

function asChatSessionRow(value: unknown) {
  return value as ChatSessionRow;
}

function asChatMessageRow(value: unknown) {
  return value as ChatMessageRow;
}

function asChatMessageRows(value: unknown) {
  return value as ChatMessageRow[];
}

export function mapChatSessionRow(row: ChatSessionRow): ChatSession {
  return {
    deviceSessionId: row.device_session_id,
    id: row.id,
    lastActivityAt: row.last_activity_at,
    productId: row.product_id,
    startedAt: row.started_at,
    status: row.status as ChatSessionStatus,
    storeId: row.store_id,
  };
}

export function mapChatMessageRow(row: ChatMessageRow): ChatMessage {
  return {
    content: row.content,
    createdAt: row.created_at,
    id: row.id,
    role: row.role as ChatMessageRole,
  };
}

async function completeActiveChatSessionsForDeviceSession(deviceSessionId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      last_activity_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("device_session_id", deviceSessionId)
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to complete previous chat sessions: ${error.message}`);
  }
}

export async function createChatSessionForDeviceSession(deviceSessionId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: deviceSession, error: deviceSessionError } = await supabase
    .from("device_sessions")
    .select("id, store_id, product_id")
    .eq("id", deviceSessionId)
    .maybeSingle();

  if (deviceSessionError) {
    throw new Error(
      `Failed to look up device session for chat creation: ${deviceSessionError.message}`,
    );
  }

  if (!deviceSession) {
    return null;
  }

  await completeActiveChatSessionsForDeviceSession(deviceSessionId);

  const insertPayload: ChatSessionInsert = {
    device_session_id: deviceSessionId,
    product_id: deviceSession.product_id,
    status: "active",
    store_id: deviceSession.store_id,
  };

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert(insertPayload)
    .select(CHAT_SESSION_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to create chat session: ${error.message}`);
  }

  await touchDeviceSession(deviceSessionId, "engaged");

  const product = await getProductById(deviceSession.product_id);

  if (!product) {
    return null;
  }

  return {
    product,
    session: mapChatSessionRow(asChatSessionRow(data)),
  } satisfies ChatSessionContext;
}

export async function appendChatMessage(
  chatSessionId: string,
  role: ChatMessageRole,
  content: string,
) {
  const supabase = createAdminSupabaseClient();
  const insertPayload: ChatMessageInsert = {
    chat_session_id: chatSessionId,
    content,
    role,
  };
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(insertPayload)
    .select(CHAT_MESSAGE_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to append chat message: ${error.message}`);
  }

  return mapChatMessageRow(asChatMessageRow(data));
}

export async function getChatSessionContextById(chatSessionId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select(CHAT_SESSION_COLUMNS)
    .eq("id", chatSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load chat session: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const session = mapChatSessionRow(asChatSessionRow(data));
  const product = await getProductById(session.productId);

  if (!product) {
    return null;
  }

  return {
    product,
    session,
  } satisfies ChatSessionContext;
}

export async function listChatMessagesBySessionId(
  chatSessionId: string,
  limit = 10,
) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select(CHAT_MESSAGE_COLUMNS)
    .eq("chat_session_id", chatSessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load chat history: ${error.message}`);
  }

  return asChatMessageRows(data).reverse().map(mapChatMessageRow);
}

export async function getFirstChatMessageBySessionId(chatSessionId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select(CHAT_MESSAGE_COLUMNS)
    .eq("chat_session_id", chatSessionId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load first chat message: ${error.message}`);
  }

  return data ? mapChatMessageRow(asChatMessageRow(data)) : null;
}

export async function touchChatSession(chatSessionId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({
      last_activity_at: new Date().toISOString(),
      status: "active",
    })
    .eq("id", chatSessionId)
    .select(CHAT_SESSION_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update chat session: ${error.message}`);
  }

  return data ? mapChatSessionRow(asChatSessionRow(data)) : null;
}

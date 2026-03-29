import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireKioskDeviceSessionAccess } from "@/lib/kiosk-auth";
import { getProductById } from "@/lib/products";
import type { Database } from "@/types/database";
import type {
  DeviceSession,
  DeviceSessionAttentionState,
  DeviceSessionState,
  MonitoredDeviceSession,
  Product,
} from "@/types/domain";

type DeviceSessionInsert =
  Database["public"]["Tables"]["device_sessions"]["Insert"];
type DeviceSessionRow = Database["public"]["Tables"]["device_sessions"]["Row"];

const DEVICE_SESSION_ATTENTION_WINDOW_MS = 15_000;

const DEVICE_SESSION_COLUMNS = [
  "id",
  "store_id",
  "product_id",
  "launched_by_manager_id",
  "state",
  "started_at",
  "last_activity_at",
  "label",
  "claimed_at",
  "last_presence_at",
  "dismissed_at",
].join(", ");

export interface DeviceSessionDetail {
  deviceSession: DeviceSession;
  product: Product;
}

function asDeviceSessionRow(value: unknown) {
  return value as DeviceSessionRow;
}

function asDeviceSessionRows(value: unknown) {
  return value as DeviceSessionRow[];
}

function getAttentionState(
  lastPresenceAt: string | null,
): DeviceSessionAttentionState {
  if (!lastPresenceAt) {
    return "attention-needed";
  }

  const lastPresenceDate = new Date(lastPresenceAt).getTime();

  if (Number.isNaN(lastPresenceDate)) {
    return "attention-needed";
  }

  return Date.now() - lastPresenceDate > DEVICE_SESSION_ATTENTION_WINDOW_MS
    ? "attention-needed"
    : "healthy";
}

export function mapDeviceSessionRow(row: DeviceSessionRow): DeviceSession {
  return {
    claimedAt: row.claimed_at,
    dismissedAt: row.dismissed_at,
    id: row.id,
    label: row.label,
    lastActivityAt: row.last_activity_at,
    lastPresenceAt: row.last_presence_at,
    launchedByManagerId: row.launched_by_manager_id,
    productId: row.product_id,
    startedAt: row.started_at,
    state: row.state as DeviceSessionState,
    storeId: row.store_id,
  };
}

export function mapMonitoredDeviceSessionRow(
  row: DeviceSessionRow,
): MonitoredDeviceSession {
  const deviceSession = mapDeviceSessionRow(row);

  return {
    ...deviceSession,
    attentionState: getAttentionState(deviceSession.lastPresenceAt),
  };
}

export async function createDeviceSessionForStore(
  storeId: string,
  launchedByManagerId: string,
  productId: string,
  label: string | null,
) {
  const supabase = createAdminSupabaseClient();
  const { data: productScope, error: productError } = await supabase
    .from("products")
    .select("id, store_id")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (productError) {
    throw new Error(
      `Failed to verify product before device launch: ${productError.message}`,
    );
  }

  if (!productScope) {
    return null;
  }

  const now = new Date().toISOString();
  const insertPayload: DeviceSessionInsert = {
    claimed_at: null,
    dismissed_at: null,
    label,
    last_presence_at: null,
    launched_by_manager_id: launchedByManagerId,
    product_id: productId,
    state: "idle",
    store_id: storeId,
    last_activity_at: now,
  };

  const { data, error } = await supabase
    .from("device_sessions")
    .insert(insertPayload)
    .select(DEVICE_SESSION_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Failed to create device session: ${error.message}`);
  }

  return mapDeviceSessionRow(asDeviceSessionRow(data));
}

export async function getDeviceSessionDetailById(deviceSessionId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("device_sessions")
    .select(DEVICE_SESSION_COLUMNS)
    .eq("id", deviceSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load device session: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const deviceSession = mapDeviceSessionRow(asDeviceSessionRow(data));
  const product = await getProductById(deviceSession.productId);

  if (!product) {
    return null;
  }

  return {
    deviceSession,
    product,
  } satisfies DeviceSessionDetail;
}

export async function getClaimedKioskDeviceSessionDetailById(
  deviceSessionId: string,
) {
  const verifiedDeviceSession = await requireKioskDeviceSessionAccess(deviceSessionId);
  const deviceSession = mapDeviceSessionRow(verifiedDeviceSession);
  const product = await getProductById(deviceSession.productId);

  if (!product) {
    return null;
  }

  return {
    deviceSession,
    product,
  } satisfies DeviceSessionDetail;
}

export async function listUndismissedDeviceSessionsByStore(
  storeId: string,
  productId?: string,
) {
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("device_sessions")
    .select(DEVICE_SESSION_COLUMNS)
    .eq("store_id", storeId)
    .is("dismissed_at", null)
    .order("started_at", { ascending: false });

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load device sessions: ${error.message}`);
  }

  return asDeviceSessionRows(data).map(mapMonitoredDeviceSessionRow);
}

export async function dismissDeviceSessionForStore(
  deviceSessionId: string,
  storeId: string,
) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("device_sessions")
    .update({
      dismissed_at: now,
      kiosk_token_hash: null,
      last_activity_at: now,
      state: "completed",
    })
    .eq("id", deviceSessionId)
    .eq("store_id", storeId)
    .select(DEVICE_SESSION_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to dismiss device session: ${error.message}`);
  }

  return data ? mapDeviceSessionRow(asDeviceSessionRow(data)) : null;
}

export async function recordDeviceSessionPresence(deviceSessionId: string) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("device_sessions")
    .update({
      last_activity_at: now,
      last_presence_at: now,
    })
    .eq("id", deviceSessionId)
    .is("dismissed_at", null)
    .select(DEVICE_SESSION_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update device session presence: ${error.message}`);
  }

  return data ? mapDeviceSessionRow(asDeviceSessionRow(data)) : null;
}

export async function touchDeviceSession(
  deviceSessionId: string,
  state: DeviceSessionState,
) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("device_sessions")
    .update({
      last_activity_at: new Date().toISOString(),
      state,
    })
    .eq("id", deviceSessionId)
    .select(DEVICE_SESSION_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update device session: ${error.message}`);
  }

  return data ? mapDeviceSessionRow(asDeviceSessionRow(data)) : null;
}

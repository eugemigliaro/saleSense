import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getProductById } from "@/lib/products";
import type { Database } from "@/types/database";
import type {
  DeviceSession,
  DeviceSessionState,
  Product,
} from "@/types/domain";

type DeviceSessionInsert =
  Database["public"]["Tables"]["device_sessions"]["Insert"];
type DeviceSessionRow = Database["public"]["Tables"]["device_sessions"]["Row"];

const DEVICE_SESSION_COLUMNS = [
  "id",
  "store_id",
  "product_id",
  "launched_by_manager_id",
  "state",
  "started_at",
  "last_activity_at",
].join(", ");

export interface DeviceSessionDetail {
  deviceSession: DeviceSession;
  product: Product;
}

function asDeviceSessionRow(value: unknown) {
  return value as DeviceSessionRow;
}

export function mapDeviceSessionRow(row: DeviceSessionRow): DeviceSession {
  return {
    id: row.id,
    lastActivityAt: row.last_activity_at,
    launchedByManagerId: row.launched_by_manager_id,
    productId: row.product_id,
    startedAt: row.started_at,
    state: row.state as DeviceSessionState,
    storeId: row.store_id,
  };
}

export async function createDeviceSessionForStore(
  storeId: string,
  launchedByManagerId: string,
  productId: string,
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

  const insertPayload: DeviceSessionInsert = {
    launched_by_manager_id: launchedByManagerId,
    product_id: productId,
    state: "idle",
    store_id: storeId,
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

export async function countActiveDeviceSessionsByStore(storeId: string) {
  const supabase = createAdminSupabaseClient();
  const { count, error } = await supabase
    .from("device_sessions")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("store_id", storeId)
    .in("state", ["idle", "engaged", "collecting-lead"]);

  if (error) {
    throw new Error(`Failed to count device sessions: ${error.message}`);
  }

  return count ?? 0;
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

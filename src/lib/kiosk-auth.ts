import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

const KIOSK_COOKIE_NAME = "salesense_kiosk";
const KIOSK_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type DeviceSessionRow = Database["public"]["Tables"]["device_sessions"]["Row"];

interface ParsedKioskCookie {
  deviceSessionId: string;
  token: string;
}

function asDeviceSessionRow(value: unknown) {
  return value as DeviceSessionRow;
}

function hashKioskToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildCookieValue(deviceSessionId: string, token: string) {
  return `${deviceSessionId}.${token}`;
}

function parseCookieValue(value: string): ParsedKioskCookie | null {
  const delimiterIndex = value.indexOf(".");

  if (delimiterIndex <= 0 || delimiterIndex >= value.length - 1) {
    return null;
  }

  return {
    deviceSessionId: value.slice(0, delimiterIndex),
    token: value.slice(delimiterIndex + 1),
  };
}

export class KioskAccessError extends Error {
  constructor(message = "Kiosk session is not authorized.") {
    super(message);
    this.name = "KioskAccessError";
  }
}

export function getKioskCookieName() {
  return KIOSK_COOKIE_NAME;
}

export async function setKioskAccessCookie(
  deviceSessionId: string,
  kioskToken: string,
) {
  const cookieStore = await cookies();

  cookieStore.set(KIOSK_COOKIE_NAME, buildCookieValue(deviceSessionId, kioskToken), {
    httpOnly: true,
    maxAge: KIOSK_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearKioskAccessCookie() {
  const cookieStore = await cookies();

  cookieStore.set(KIOSK_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function issueKioskAccessForDeviceSession(deviceSessionId: string) {
  const supabase = createAdminSupabaseClient();
  const kioskToken = randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("device_sessions")
    .update({
      claimed_at: now,
      dismissed_at: null,
      kiosk_token_hash: hashKioskToken(kioskToken),
      last_activity_at: now,
      last_presence_at: now,
      state: "idle",
    })
    .eq("id", deviceSessionId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to issue kiosk access token: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    deviceSessionId,
    kioskToken,
  };
}

async function getKioskCookieValue() {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(KIOSK_COOKIE_NAME)?.value;

  if (!rawValue) {
    return null;
  }

  return parseCookieValue(rawValue);
}

export async function getKioskCookieDeviceSessionId() {
  const parsedCookie = await getKioskCookieValue();

  return parsedCookie?.deviceSessionId ?? null;
}

export async function getVerifiedKioskDeviceSessionRow() {
  const parsedCookie = await getKioskCookieValue();

  if (!parsedCookie) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("device_sessions")
    .select(
      [
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
        "kiosk_token_hash",
      ].join(", "),
    )
    .eq("id", parsedCookie.deviceSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify kiosk session: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const deviceSession = asDeviceSessionRow(data);

  if (
    deviceSession.dismissed_at ||
    !deviceSession.kiosk_token_hash ||
    deviceSession.kiosk_token_hash !== hashKioskToken(parsedCookie.token)
  ) {
    return null;
  }

  return deviceSession;
}

export async function requireKioskDeviceSessionAccess(deviceSessionId: string) {
  const verifiedDeviceSession = await getVerifiedKioskDeviceSessionRow();

  if (!verifiedDeviceSession || verifiedDeviceSession.id !== deviceSessionId) {
    throw new KioskAccessError();
  }

  return verifiedDeviceSession;
}

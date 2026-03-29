import { getSellerContext } from "@/lib/auth";
import {
  InvalidJsonBodyError,
  jsonInvalidJsonError,
  jsonNotFoundError,
  jsonServerError,
  jsonUnauthorizedError,
  jsonValidationError,
  readJsonBody,
} from "@/lib/api-request";
import { jsonSuccess } from "@/lib/api-response";
import {
  createDeviceSessionForStore,
  listUndismissedDeviceSessionsByStore,
} from "@/lib/device-sessions";
import { issueKioskAccessForDeviceSession, setKioskAccessCookie } from "@/lib/kiosk-auth";
import {
  createDeviceSessionSchema,
  listDeviceSessionsQuerySchema,
} from "@/lib/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getQueryInput(request: Request) {
  const url = new URL(request.url);

  return {
    productId: url.searchParams.get("productId") ?? undefined,
  };
}

export async function GET(request: Request) {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const queryResult = listDeviceSessionsQuerySchema.safeParse(
      getQueryInput(request),
    );

    if (!queryResult.success) {
      return jsonValidationError(queryResult.error);
    }

    const deviceSessions = await listUndismissedDeviceSessionsByStore(
      sellerContext.storeId,
      queryResult.data.productId,
    );

    return jsonSuccess(deviceSessions);
  } catch (error) {
    console.error("Failed to list device sessions.", error);

    return jsonServerError("Failed to load device sessions.");
  }
}

export async function POST(request: Request) {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const body = await readJsonBody(request);
    const validationResult = createDeviceSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const deviceSession = await createDeviceSessionForStore(
      sellerContext.storeId,
      sellerContext.userId,
      validationResult.data.productId,
      validationResult.data.label ?? null,
    );

    if (!deviceSession) {
      return jsonNotFoundError("Product not found.");
    }

    const kioskAccess = await issueKioskAccessForDeviceSession(deviceSession.id);

    if (!kioskAccess) {
      return jsonNotFoundError("Device session not found.");
    }

    const supabase = await createServerSupabaseClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      throw new Error(`Failed to sign out seller after launch: ${signOutError.message}`);
    }

    await setKioskAccessCookie(
      kioskAccess.deviceSessionId,
      kioskAccess.kioskToken,
    );

    return jsonSuccess(
      {
        deviceSession,
        kioskUrl: `/kiosk?device=${deviceSession.id}`,
      },
      {
        headers: {
          Location: `/api/v1/device-sessions/${deviceSession.id}`,
        },
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    console.error("Failed to create device session.", error);

    return jsonServerError("Failed to create device session.");
  }
}

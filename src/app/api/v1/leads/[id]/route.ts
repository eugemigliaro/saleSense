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
  leadIdParamsSchema,
  normalizeUpdateLeadSaleConfirmationInput,
  updateLeadSaleConfirmationSchema,
} from "@/lib/schemas";
import { updateLeadSaleConfirmationForStore } from "@/lib/leads";

interface LeadRouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: Request, context: LeadRouteContext) {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const paramsResult = leadIdParamsSchema.safeParse(await context.params);

    if (!paramsResult.success) {
      return jsonValidationError(paramsResult.error);
    }

    const body = await readJsonBody(request);
    const validationResult = updateLeadSaleConfirmationSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const lead = await updateLeadSaleConfirmationForStore(
      paramsResult.data.id,
      sellerContext.storeId,
      normalizeUpdateLeadSaleConfirmationInput(validationResult.data),
    );

    if (!lead) {
      return jsonNotFoundError("Lead not found.");
    }

    return jsonSuccess(lead);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    console.error("Failed to update lead sale confirmation.", error);

    return jsonServerError("Failed to update lead.");
  }
}

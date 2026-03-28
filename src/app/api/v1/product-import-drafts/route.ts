import { getSellerContext } from "@/lib/auth";
import {
  InvalidJsonBodyError,
  jsonInvalidJsonError,
  jsonServerError,
  jsonUnauthorizedError,
  jsonValidationError,
  readJsonBody,
} from "@/lib/api-request";
import { generateProductImportDraft } from "@/lib/ai/productImport";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { createProductImportDraftSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const sellerContext = await getSellerContext();

  if (!sellerContext) {
    return jsonUnauthorizedError();
  }

  try {
    const body = await readJsonBody(request);
    const validationResult = createProductImportDraftSchema.safeParse(body);

    if (!validationResult.success) {
      return jsonValidationError(validationResult.error);
    }

    const draftPayload = await generateProductImportDraft(
      validationResult.data.sourceUrls,
    );

    if (draftPayload.draft.sourceUrls.length === 0) {
      return jsonError({
        code: "external_retrieval_failed",
        message:
          "Could not retrieve enough public product information from the provided source URLs.",
        status: 422,
      });
    }

    return jsonSuccess(draftPayload);
  } catch (error) {
    if (error instanceof InvalidJsonBodyError) {
      return jsonInvalidJsonError();
    }

    console.error("Failed to generate product import draft.", error);

    return jsonServerError("Failed to generate product import draft.");
  }
}

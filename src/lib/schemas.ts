import { z } from "zod";

const PRODUCT_NAME_MAX_LENGTH = 120;
const PRODUCT_BRAND_MAX_LENGTH = 80;
const PRODUCT_CATEGORY_MAX_LENGTH = 80;
const PRODUCT_DETAILS_MAX_LENGTH = 20_000;
const PRODUCT_COMPARISON_SNIPPET_MAX_LENGTH = 4_000;
const PRODUCT_IDLE_MEDIA_URL_MAX_LENGTH = 2_048;

const LEAD_NAME_MAX_LENGTH = 120;
const LEAD_EMAIL_MAX_LENGTH = 320;
const LEAD_PHONE_MAX_LENGTH = 50;
const LEAD_SUMMARY_MAX_LENGTH = 4_000;
const LEAD_SHORT_TEXT_MAX_LENGTH = 200;
const CHAT_MESSAGE_MAX_LENGTH = 2_000;
const CHAT_HISTORY_MAX_ITEMS = 20;

function requiredText(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(maxLength, `${label} must be at most ${maxLength} characters.`);
}

function optionalText(label: string, maxLength: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();

      return trimmed.length > 0 ? trimmed : undefined;
    },
    z
      .string()
      .max(maxLength, `${label} must be at most ${maxLength} characters.`)
      .optional(),
  );
}

function httpUrl(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .url(`${label} must be a valid URL.`)
    .refine((value) => {
      const protocol = new URL(value).protocol;

      return protocol === "http:" || protocol === "https:";
    }, `${label} must use http or https.`);
}

function emailAddress(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(maxLength, `${label} must be at most ${maxLength} characters.`)
    .email(`${label} must be a valid email address.`)
    .transform((value) => value.toLowerCase());
}

const createProductShape = {
  brand: requiredText("Brand", PRODUCT_BRAND_MAX_LENGTH),
  category: requiredText("Category", PRODUCT_CATEGORY_MAX_LENGTH),
  comparisonSnippetMarkdown: requiredText(
    "Comparison snippet",
    PRODUCT_COMPARISON_SNIPPET_MAX_LENGTH,
  ),
  detailsMarkdown: requiredText("Product details", PRODUCT_DETAILS_MAX_LENGTH),
  idleMediaUrl: httpUrl("Idle media URL", PRODUCT_IDLE_MEDIA_URL_MAX_LENGTH),
  name: requiredText("Product name", PRODUCT_NAME_MAX_LENGTH),
};

export const createProductSchema = z.object(createProductShape).strict();

export const updateProductSchema = createProductSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one product field must be provided.",
    path: ["body"],
  });

export const productIdParamsSchema = z.object({
  id: z.string().uuid("Product id must be a valid UUID."),
});

export const createDeviceSessionSchema = z
  .object({
    productId: z.string().uuid("Product id must be a valid UUID."),
  })
  .strict();

export const deviceSessionIdParamsSchema = z.object({
  id: z.string().uuid("Device session id must be a valid UUID."),
});

export const createLeadSchema = z
  .object({
    aiSummary: optionalText("AI summary", LEAD_SUMMARY_MAX_LENGTH),
    customerEmail: emailAddress("Customer email", LEAD_EMAIL_MAX_LENGTH),
    customerName: requiredText("Customer name", LEAD_NAME_MAX_LENGTH),
    customerPhone: optionalText("Customer phone", LEAD_PHONE_MAX_LENGTH),
    inferredInterest: optionalText(
      "Inferred interest",
      LEAD_SHORT_TEXT_MAX_LENGTH,
    ),
    nextBestProduct: optionalText(
      "Next best product",
      LEAD_SHORT_TEXT_MAX_LENGTH,
    ),
    productId: z.string().uuid("Product id must be a valid UUID."),
  })
  .strict();

export const createChatSessionSchema = z
  .object({
    deviceSessionId: z.string().uuid("Device session id must be a valid UUID."),
  })
  .strict();

const sendChatHistoryMessageSchema = z
  .object({
    content: requiredText("History message", CHAT_MESSAGE_MAX_LENGTH),
    role: z.enum(["assistant", "user"]),
  })
  .strict();

export const chatSessionIdParamsSchema = z.object({
  id: z.string().uuid("Chat session id must be a valid UUID."),
});

export const sendChatMessageSchema = z
  .object({
    content: requiredText("Message", CHAT_MESSAGE_MAX_LENGTH),
    history: z
      .array(sendChatHistoryMessageSchema)
      .max(
        CHAT_HISTORY_MAX_ITEMS,
        `History must contain at most ${CHAT_HISTORY_MAX_ITEMS} messages.`,
      )
      .optional(),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateDeviceSessionInput = z.infer<typeof createDeviceSessionSchema>;
export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;

export interface CreateLeadInput {
  aiSummary: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  inferredInterest: string | null;
  nextBestProduct: string | null;
  productId: string;
}

export interface SendChatHistoryMessageInput {
  content: string;
  role: "assistant" | "user";
}

export interface SendChatMessageInput {
  content: string;
  history: SendChatHistoryMessageInput[];
}

export function normalizeCreateLeadInput(
  value: z.infer<typeof createLeadSchema>,
): CreateLeadInput {
  return {
    aiSummary: value.aiSummary ?? null,
    customerEmail: value.customerEmail,
    customerName: value.customerName,
    customerPhone: value.customerPhone ?? null,
    inferredInterest: value.inferredInterest ?? null,
    nextBestProduct: value.nextBestProduct ?? null,
    productId: value.productId,
  };
}

export function normalizeSendChatMessageInput(
  value: z.infer<typeof sendChatMessageSchema>,
): SendChatMessageInput {
  return {
    content: value.content,
    history: value.history ?? [],
  };
}

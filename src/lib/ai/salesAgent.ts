import "server-only";

import { z } from "zod";

import {
  selectAlternativeProductIds,
  selectRelevantComparisonProducts,
} from "@/lib/ai/alternativeProducts";
import {
  detectChatResearchIntent,
  gatherExternalResearch,
} from "@/lib/ai/chatResearch";
import { generateGeminiJson } from "@/lib/ai/geminiClient";
import {
  listComparisonProductsByStore,
  listProductsByIdsForStore,
  type ComparisonProduct,
} from "@/lib/products";
import type {
  ChatMessageGrounding,
  LeadCaptureBenefit,
  LeadCaptureInstruction,
  LeadCaptureState,
} from "@/types/api";
import type { ChatMessage, Product } from "@/types/domain";

const ACTIVE_PRODUCT_MARKDOWN_MAX_LENGTH = 8_000;
const ALTERNATIVE_PRODUCT_MARKDOWN_MAX_LENGTH = 4_000;
const HISTORY_MESSAGE_LIMIT = 10;
const LEAD_CAPTURE_INTENT_RATIONALE_MAX_LENGTH = 300;
const SALES_AGENT_MESSAGE_MAX_LENGTH = 1_500;
const STORE_CATALOG_SNIPPET_MAX_LENGTH = 320;
const SALES_AGENT_RESPONSE_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    confidence: {
      enum: ["high", "medium", "low"],
      type: "string",
    },
    language: {
      enum: ["en", "es"],
      type: "string",
    },
    message: {
      type: "string",
    },
    objective: {
      enum: ["qualify", "pitch", "compare", "redirect", "reframe", "handoff"],
      type: "string",
    },
    recommendedAlternativeProductName: {
      type: ["string", "null"],
    },
    suggestedTryout: {
      type: ["string", "null"],
    },
  },
  required: [
    "message",
    "language",
    "objective",
    "suggestedTryout",
    "recommendedAlternativeProductName",
    "confidence",
  ],
  type: "object",
} as const;
const LEAD_CAPTURE_INTENT_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    leadCaptureBenefit: {
      type: ["string", "null"],
      enum: [
        "seller-follow-up",
        "conversation-summary",
        "product-details",
        null,
      ],
    },
    rationale: {
      type: ["string", "null"],
    },
    shouldNotifyStoreStaff: {
      type: "boolean",
    },
  },
  required: [
    "leadCaptureBenefit",
    "rationale",
    "shouldNotifyStoreStaff",
  ],
  type: "object",
} as const;

const salesAgentDraftSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  language: z.enum(["en", "es"]),
  message: z.string().trim().min(1).max(SALES_AGENT_MESSAGE_MAX_LENGTH),
  objective: z.enum(["qualify", "pitch", "compare", "redirect", "reframe", "handoff"]),
  recommendedAlternativeProductName: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .nullable(),
  suggestedTryout: z.string().trim().min(1).max(240).nullable(),
});
const leadCaptureIntentSchema = z.object({
  leadCaptureBenefit: z
    .enum(["seller-follow-up", "conversation-summary", "product-details"])
    .nullable(),
  rationale: z
    .string()
    .trim()
    .min(1)
    .max(LEAD_CAPTURE_INTENT_RATIONALE_MAX_LENGTH)
    .nullable(),
  shouldNotifyStoreStaff: z.boolean(),
});

export type SalesAgentDraft = z.infer<typeof salesAgentDraftSchema>;
export type LeadCaptureIntentDecision = z.infer<typeof leadCaptureIntentSchema>;

export interface SalesAgentInput {
  activeProduct: Product;
  alternativeProducts: Product[];
  availableStoreProducts: ComparisonProduct[];
  externalResearchSummary: string | null;
  history: ChatMessage[];
}

export interface GenerateSalesAssistantReplyInput {
  activeProduct: Product;
  history: ChatMessage[];
  leadCaptureState: LeadCaptureState;
  storeId: string;
}

export interface SalesAssistantReplyResult {
  draft: SalesAgentDraft;
  grounding: ChatMessageGrounding | null;
  leadCapture: LeadCaptureInstruction | null;
  notifyStoreStaff: boolean;
}

interface GenerateSalesAssistantReplyOptions {
  comparisonProducts?: ComparisonProduct[];
  leadCaptureIntentDetector?: (
    input: LeadCaptureIntentInput,
  ) => Promise<LeadCaptureIntentDecision>;
  provider?: (input: SalesAgentInput) => Promise<SalesAgentDraft>;
}

export interface LeadCaptureIntentInput {
  activeProduct: Product;
  alternativeProducts: Product[];
  draft: SalesAgentDraft;
  history: ChatMessage[];
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}\n...`;
}

function getRecentHistory(history: ChatMessage[]) {
  return history.slice(-HISTORY_MESSAGE_LIMIT);
}

function getLatestUserMessage(history: ChatMessage[]) {
  const latestUserMessage = [...history]
    .reverse()
    .find((message) => message.role === "user");

  return latestUserMessage?.content ?? "";
}

function inferLanguageHint(value: string): "en" | "es" {
  const normalized = ` ${value.toLowerCase()} `;
  const spanishSignals = [
    " que ",
    " para ",
    " con ",
    " necesito ",
    " quiero ",
    " compar",
    " bateria",
    " pantalla",
    " camara",
    " precio",
    " hola ",
    " gracias ",
  ];

  return spanishSignals.some((signal) => normalized.includes(signal))
    ? "es"
    : "en";
}

function formatHistory(history: ChatMessage[]) {
  if (history.length === 0) {
    return "No prior transcript.";
  }

  return history
    .map(
      (message) =>
        `${message.role === "assistant" ? "Assistant" : "Customer"}: ${message.content}`,
    )
    .join("\n");
}

function formatAlternativeProducts(products: Product[]) {
  if (products.length === 0) {
    return "- No other in-store products are currently relevant.";
  }

  return products
    .map((product) =>
      [
        `- ${product.brand} ${product.name} (${product.category})`,
        "  Full product details:",
        truncateText(product.detailsMarkdown, ALTERNATIVE_PRODUCT_MARKDOWN_MAX_LENGTH)
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n"),
      ].join("\n"),
    )
    .join("\n");
}

function formatAvailableStoreProducts(
  activeProduct: Product,
  products: ComparisonProduct[],
) {
  const activeProductEntry = [
    `- ${activeProduct.brand} ${activeProduct.name} (${activeProduct.category})`,
    "  This is the active product currently on display.",
  ].join("\n");

  if (products.length === 0) {
    return `${activeProductEntry}\n- No other same-store products are available for recommendation.`;
  }

  return [
    activeProductEntry,
    ...products.map((product) =>
      [
        `- ${product.brand} ${product.name} (${product.category})`,
        `  Comparison snippet: ${truncateText(product.comparisonSnippetMarkdown, STORE_CATALOG_SNIPPET_MAX_LENGTH)}`,
      ].join("\n"),
    ),
  ].join("\n");
}

function normalizeProductLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolveAllowedAlternativeName(
  value: string | null,
  alternativeProducts: Product[],
) {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeProductLabel(value);

  for (const product of alternativeProducts) {
    const candidateLabels = [
      product.name,
      `${product.brand} ${product.name}`,
    ];

    if (
      candidateLabels.some(
        (candidateLabel) =>
          normalizeProductLabel(candidateLabel) === normalizedValue,
      )
    ) {
      return product.name;
    }
  }

  return null;
}

function buildLeadCapturePrompt(input: {
  activeProduct: Product;
  benefit: LeadCaptureBenefit;
  language: "en" | "es";
}) {
  const productLabel = `${input.activeProduct.brand} ${input.activeProduct.name}`;

  if (input.language === "es") {
    switch (input.benefit) {
      case "conversation-summary":
        return `Si queres, dejame tu email y te mando un resumen corto de esta comparacion para revisarlo con calma.`;
      case "product-details":
        return `Si queres, dejame tu email y te mando la info de ${productLabel} para que la tengas a mano.`;
      default:
        return `Si queres, dejame tu email y hago que un vendedor se acerque con esta opcion para ayudarte con los proximos pasos.`;
    }
  }

  switch (input.benefit) {
    case "conversation-summary":
      return "If you want, leave your email and I’ll send a short summary of this comparison to your inbox.";
    case "product-details":
      return `If you want, leave your email and I’ll send the details for ${productLabel} to your inbox.`;
    default:
      return "If you want, leave your email and a seller can approach you with this option to help with the next buying step.";
  }
}

function buildLeadCaptureAnnouncement(input: {
  benefit: LeadCaptureBenefit;
  language: "en" | "es";
}) {
  if (input.language === "es") {
    switch (input.benefit) {
      case "conversation-summary":
        return "Si queres, podes dejar tu email en el recuadro que aparece en pantalla y te mando este resumen.";
      case "product-details":
        return "Si queres, podes dejar tu email en el recuadro que aparece en pantalla y te mando la info del producto.";
      default:
        return "Si queres, podes dejar tu email en el recuadro que aparece en pantalla y hago que un vendedor siga con vos desde aca.";
    }
  }

  switch (input.benefit) {
    case "conversation-summary":
      return "If you want, you can leave your email in the prompt on screen and I’ll send this summary to your inbox.";
    case "product-details":
      return "If you want, you can leave your email in the prompt on screen and I’ll send the product details to your inbox.";
    default:
      return "If you want, you can leave your email in the prompt on screen and a seller can take it from here.";
  }
}

function buildStoreHandoffMessage(input: {
  activeProduct: Product;
  language: "en" | "es";
}) {
  const productLabel = `${input.activeProduct.brand} ${input.activeProduct.name}`;

  if (input.language === "es") {
    return `Yo no puedo gestionar pagos, confirmar precios ni cerrar la compra por mi cuenta. Voy a derivarte con un vendedor en tienda para que siga con ${productLabel} y te ayude desde aca.`;
  }

  return `I can’t handle payment, confirm pricing, or complete the purchase myself. I’m handing this over to an in-store employee so they can take it from here with the ${productLabel}.`;
}

function normalizeLeadCaptureIntent(value: unknown) {
  if (!value || typeof value !== "object") {
    return value;
  }

  const rawDecision = value as Record<string, unknown>;

  return {
    ...rawDecision,
    rationale:
      typeof rawDecision.rationale === "string"
        ? rawDecision.rationale.slice(0, LEAD_CAPTURE_INTENT_RATIONALE_MAX_LENGTH)
        : rawDecision.rationale,
  };
}

const LEAD_CAPTURE_INTENT_SYSTEM_INSTRUCTION = [
  "You decide whether a SaleSense conversation should trigger contact collection or an in-store staff handoff.",
  "Use customer intent from the recent transcript and the proposed assistant reply.",
  "Do not rely on hard-coded keywords.",
  "Set shouldNotifyStoreStaff to true when the customer is trying to move into human-assisted next steps that the kiosk cannot complete on its own.",
  "Examples of those next steps include purchase progression, live commercial confirmation, real-world follow-up, or asking for a person to continue.",
  "Set leadCaptureBenefit to seller-follow-up when a human seller follow-up is the clearest value of collecting contact information.",
  "Set leadCaptureBenefit to conversation-summary when the customer is comparing options and an emailed summary would clearly help them continue later.",
  "Set leadCaptureBenefit to product-details when the customer would benefit from receiving this product's details later without clearly needing a human seller next.",
  "Return null for leadCaptureBenefit when asking for contact information would feel premature, pushy, or unnecessary.",
  "Only use conversation-summary when the conversation genuinely involves other same-store alternatives worth comparing.",
  "Return only valid JSON that matches the required schema.",
].join(" ");

function buildLeadCaptureIntentPrompt(input: LeadCaptureIntentInput) {
  const recentHistory = getRecentHistory(input.history);

  return [
    "Active product:",
    `Name: ${input.activeProduct.name}`,
    `Brand: ${input.activeProduct.brand}`,
    `Category: ${input.activeProduct.category}`,
    "",
    "Relevant alternative same-store products:",
    input.alternativeProducts.length > 0
      ? input.alternativeProducts
          .map(
            (product) =>
              `- ${product.brand} ${product.name}: ${truncateText(product.comparisonSnippetMarkdown, 220)}`,
          )
          .join("\n")
      : "- No alternative same-store products are currently relevant.",
    "",
    "Recent transcript:",
    formatHistory(recentHistory),
    "",
    "Proposed assistant reply:",
    `Objective: ${input.draft.objective}`,
    `Language: ${input.draft.language}`,
    `Message: ${input.draft.message}`,
    "",
    "Decide whether this moment should trigger optional contact collection and whether the store staff should be notified.",
  ].join("\n");
}

async function detectLeadCaptureIntent(input: LeadCaptureIntentInput) {
  try {
    const rawDecision = await generateGeminiJson<unknown>(
      buildLeadCaptureIntentPrompt(input),
      {
        responseJsonSchema: LEAD_CAPTURE_INTENT_JSON_SCHEMA,
        systemInstruction: LEAD_CAPTURE_INTENT_SYSTEM_INSTRUCTION,
      },
    );

    return leadCaptureIntentSchema.parse(normalizeLeadCaptureIntent(rawDecision));
  } catch (error) {
    console.error("Failed to detect lead capture intent. Falling back.", error);

    return {
      leadCaptureBenefit: null,
      rationale: null,
      shouldNotifyStoreStaff: false,
    } satisfies LeadCaptureIntentDecision;
  }
}

function applyStoreHandoffDecision(input: {
  activeProduct: Product;
  draft: SalesAgentDraft;
  shouldNotifyStoreStaff: boolean;
}) {
  if (!input.shouldNotifyStoreStaff && input.draft.objective !== "handoff") {
    return {
      draft: input.draft,
      notifyStoreStaff: false,
    };
  }

  return {
    draft: {
      ...input.draft,
      confidence: "high",
      message: buildStoreHandoffMessage({
        activeProduct: input.activeProduct,
        language: input.draft.language,
      }),
      objective: "handoff",
      recommendedAlternativeProductName: null,
      suggestedTryout: null,
    } satisfies SalesAgentDraft,
    notifyStoreStaff: true,
  };
}

export function resolveLeadCaptureInstruction(input: {
  activeProduct: Product;
  alternativeProducts: Product[];
  leadCaptureBenefit: LeadCaptureBenefit | null;
  language: "en" | "es";
  leadCaptureState: LeadCaptureState;
}): LeadCaptureInstruction | null {
  if (input.leadCaptureState !== "idle") {
    return null;
  }

  if (!input.leadCaptureBenefit) {
    return null;
  }

  if (
    input.leadCaptureBenefit === "conversation-summary" &&
    input.alternativeProducts.length === 0
  ) {
    return null;
  }

  return {
    benefit: input.leadCaptureBenefit,
    language: input.language,
    prompt: buildLeadCapturePrompt({
      activeProduct: input.activeProduct,
      benefit: input.leadCaptureBenefit,
      language: input.language,
    }),
    shouldPrompt: true,
  };
}

function attachLeadCaptureAnnouncement(input: {
  draft: SalesAgentDraft;
  leadCapture: LeadCaptureInstruction | null;
}) {
  if (!input.leadCapture?.shouldPrompt) {
    return input.draft;
  }

  return {
    ...input.draft,
    message: `${input.draft.message} ${buildLeadCaptureAnnouncement({
      benefit: input.leadCapture.benefit,
      language: input.leadCapture.language,
    })}`.trim(),
  } satisfies SalesAgentDraft;
}

const SALES_AGENT_SYSTEM_INSTRUCTION = [
  "You are SaleSense, an expert in-store retail salesperson for any product category.",
  "Act like a strong consultative salesperson, not a support bot and not a technical manual.",
  "Mirror the customer's language. Default to English if unclear.",
  "Use the active product details markdown as the primary source of truth.",
  "The same-store catalog section defines every product you are allowed to recommend in this conversation.",
  "Never recommend, redirect to, or suggest buying a product that is not in that same-store catalog.",
  "Only consider alternative in-store products that were explicitly supplied as relevant context.",
  "If alternative in-store products are present, you may compare them in depth because they have already been screened as worth considering.",
  "If the customer's current comparison axis cannot be won by the active product or any same-store product, acknowledge that briefly and shift focus to a different need where an in-store product can still create value.",
  "If the customer's needs are still unclear, ask one short qualifying question instead of listing specs.",
  "When helpful, suggest one concrete thing the customer can try on the current device right now.",
  "Prefer selling the active product unless the customer's stated needs clearly mismatch it.",
  "Use any external research summary only as supplemental evidence, never as a replacement for store-managed product data.",
  "Do not speak as if competitor or web-researched products are available for purchase here unless they are explicitly listed in the same-store catalog.",
  "You cannot handle payment, confirm live pricing, confirm stock, or complete the purchase yourself.",
  "If the customer wants to advance toward payment, pricing confirmation, stock confirmation, or closing the purchase, explicitly hand off to an in-store employee.",
  "Do not invent features, pricing, stock, policies, or claims not supported by the provided context.",
  "Keep the response concise, practical, and persuasive without sounding pushy or scripted.",
  "Return only valid JSON that matches the required schema.",
].join(" ");

export function buildSalesAgentPrompt(input: SalesAgentInput) {
  const recentHistory = getRecentHistory(input.history);
  const latestCustomerMessage = getLatestUserMessage(recentHistory);

  return [
    "Required JSON shape:",
    '{"message":"string","language":"en|es","objective":"qualify|pitch|compare|redirect|reframe|handoff","suggestedTryout":"string|null","recommendedAlternativeProductName":"string|null","confidence":"high|medium|low"}',
    "",
    "Sales policy:",
    "- Keep the sale centered on the active product and the same-store catalog only.",
    "- If a product is not listed in the same-store catalog below, treat it as unavailable and do not recommend it.",
    "- Sell the active product first when it plausibly fits the customer.",
    "- Compare deeply only with the alternative in-store products already selected as relevant.",
    "- Redirect only if a listed same-store alternative is clearly a better fit.",
    "- If the customer's current angle makes every same-store option look weak, briefly acknowledge that and switch focus to an angle where an in-store product can still help.",
    "- Keep the answer short and directly usable in a live retail conversation.",
    "",
    "Active product:",
    `Name: ${input.activeProduct.name}`,
    `Brand: ${input.activeProduct.brand}`,
    `Category: ${input.activeProduct.category}`,
    "Primary details markdown:",
    truncateText(
      input.activeProduct.detailsMarkdown,
      ACTIVE_PRODUCT_MARKDOWN_MAX_LENGTH,
    ),
    "",
    "Same-store catalog boundary:",
    formatAvailableStoreProducts(input.activeProduct, input.availableStoreProducts),
    "",
    "Relevant alternative in-store products:",
    formatAlternativeProducts(input.alternativeProducts),
    "",
    "Supplemental external research summary:",
    input.externalResearchSummary ?? "No external research used.",
    "",
    "Recent transcript:",
    formatHistory(recentHistory),
    "",
    `Latest customer message: ${latestCustomerMessage || "No customer message available."}`,
  ].join("\n");
}

export function buildFallbackSalesAgentReply(
  input: SalesAgentInput,
): SalesAgentDraft {
  const recentHistory = getRecentHistory(input.history);
  const latestCustomerMessage = getLatestUserMessage(recentHistory);
  const language = inferLanguageHint(latestCustomerMessage);
  const alternativeProduct = input.alternativeProducts[0] ?? null;
  const activeProductLabel = `${input.activeProduct.brand} ${input.activeProduct.name}`;
  const tryoutSuggestion =
    language === "es"
      ? `Proba el ${activeProductLabel} directamente aca y fijate si la experiencia te resulta natural.`
      : `Try the ${activeProductLabel} right here and see whether it feels natural to use.`;

  const externalResearchLine =
    input.externalResearchSummary && input.externalResearchSummary.trim().length > 0
      ? language === "es"
        ? `Tambien tengo contexto reciente para ayudarte a comparar con mas precision.`
        : `I also have some fresh context to help compare it more accurately.`
      : null;

  const message =
    language === "es"
      ? alternativeProduct
        ? `El ${activeProductLabel} sigue siendo mi referencia principal para lo que me planteas. Si queres, te explico rapidamente en que se diferencia de ${alternativeProduct.brand} ${alternativeProduct.name} y que conviene probar primero. ${externalResearchLine ?? ""} ${tryoutSuggestion}`.trim()
        : `Voy a mantener esto enfocado en lo que tenemos en esta tienda. Si ese punto exacto no define toda la decision, decime que te importa despues y te muestro donde el ${activeProductLabel} puede encajar bien. ${externalResearchLine ?? ""} ${tryoutSuggestion}`.trim()
      : alternativeProduct
        ? `The ${activeProductLabel} is still my main reference for what you need. If you want, I can quickly show how it differs from the ${alternativeProduct.brand} ${alternativeProduct.name} and what to try first. ${externalResearchLine ?? ""} ${tryoutSuggestion}`.trim()
        : `I’ll keep this focused on what we have in this store. If that exact point is not the whole decision, tell me what matters next most and I’ll show where the ${activeProductLabel} can still be a strong fit. ${externalResearchLine ?? ""} ${tryoutSuggestion}`.trim();

  return {
    confidence: "low",
    language,
    message,
    objective: alternativeProduct ? "compare" : "reframe",
    recommendedAlternativeProductName: alternativeProduct?.name ?? null,
    suggestedTryout: tryoutSuggestion,
  };
}

export async function generateSalesAgentDraftWithGemini(input: SalesAgentInput) {
  const prompt = buildSalesAgentPrompt(input);
  const rawDraft = await generateGeminiJson<unknown>(
    prompt,
    {
      responseJsonSchema: SALES_AGENT_RESPONSE_JSON_SCHEMA,
      systemInstruction: SALES_AGENT_SYSTEM_INSTRUCTION,
    },
  );

  return salesAgentDraftSchema.parse(rawDraft);
}

async function selectAlternativeProducts(input: {
  activeProduct: Product;
  comparisonProducts: ComparisonProduct[];
  history: ChatMessage[];
  storeId: string;
}) {
  const selectedProductIds = await selectAlternativeProductIds({
    activeProduct: input.activeProduct,
    comparisonProducts: input.comparisonProducts,
    history: input.history,
  });

  return listProductsByIdsForStore(input.storeId, selectedProductIds);
}

function enforceStoreCatalogBoundary(
  input: SalesAgentInput,
  draft: SalesAgentDraft,
) {
  const normalizedAlternativeName = resolveAllowedAlternativeName(
    draft.recommendedAlternativeProductName,
    input.alternativeProducts,
  );

  const requiresAlternative =
    draft.objective === "compare" || draft.objective === "redirect";
  const hasAllowedAlternative = input.alternativeProducts.length > 0;
  const hasInvalidAlternativeReference =
    draft.recommendedAlternativeProductName !== null &&
    normalizedAlternativeName === null;
  const missingRedirectTarget =
    draft.objective === "redirect" && normalizedAlternativeName === null;

  if (hasInvalidAlternativeReference) {
    return buildFallbackSalesAgentReply(input);
  }

  if (missingRedirectTarget) {
    return buildFallbackSalesAgentReply(input);
  }

  if (requiresAlternative && !hasAllowedAlternative) {
    return buildFallbackSalesAgentReply(input);
  }

  return {
    ...draft,
    recommendedAlternativeProductName: normalizedAlternativeName,
  } satisfies SalesAgentDraft;
}

export async function generateSalesAssistantReply(
  input: GenerateSalesAssistantReplyInput,
  options: GenerateSalesAssistantReplyOptions = {},
): Promise<SalesAssistantReplyResult> {
  const comparisonProducts =
    options.comparisonProducts ??
    (await listComparisonProductsByStore(input.storeId, input.activeProduct.id));
  const trimmedHistory = getRecentHistory(input.history);
  const researchDecision = await detectChatResearchIntent({
    activeProduct: input.activeProduct,
    availableStoreProducts: comparisonProducts,
    history: trimmedHistory,
  });
  const [alternativeProducts, externalResearch] = await Promise.all([
    selectAlternativeProducts({
      activeProduct: input.activeProduct,
      comparisonProducts,
      history: trimmedHistory,
      storeId: input.storeId,
    }),
    researchDecision.shouldUseExternalResearch && researchDecision.researchBrief
      ? gatherExternalResearch({
          activeProduct: input.activeProduct,
          availableStoreProducts: comparisonProducts,
          history: trimmedHistory,
          researchBrief: researchDecision.researchBrief,
          tools: researchDecision.tools,
        })
      : Promise.resolve(null),
  ]);
  const salesAgentInput: SalesAgentInput = {
    activeProduct: input.activeProduct,
    alternativeProducts,
    availableStoreProducts: comparisonProducts,
    externalResearchSummary: externalResearch?.summary ?? null,
    history: trimmedHistory,
  };
  const provider = options.provider ?? generateSalesAgentDraftWithGemini;
  const leadCaptureIntentDetector =
    options.leadCaptureIntentDetector ?? detectLeadCaptureIntent;

  try {
    const boundedDraft = enforceStoreCatalogBoundary(
      salesAgentInput,
      await provider(salesAgentInput),
    );
    const leadCaptureIntent = await leadCaptureIntentDetector({
      activeProduct: input.activeProduct,
      alternativeProducts,
      draft: boundedDraft,
      history: trimmedHistory,
    });
    const purchaseBoundary = applyStoreHandoffDecision({
      activeProduct: input.activeProduct,
      draft: boundedDraft,
      shouldNotifyStoreStaff: leadCaptureIntent.shouldNotifyStoreStaff,
    });
    const leadCapture = resolveLeadCaptureInstruction({
      activeProduct: input.activeProduct,
      alternativeProducts,
      leadCaptureBenefit:
        leadCaptureIntent.leadCaptureBenefit ??
        (purchaseBoundary.notifyStoreStaff ? "seller-follow-up" : null),
      language: purchaseBoundary.draft.language,
      leadCaptureState: input.leadCaptureState,
    });
    const draft = attachLeadCaptureAnnouncement({
      draft: purchaseBoundary.draft,
      leadCapture,
    });

    return {
      draft,
      grounding: externalResearch?.grounding ?? null,
      leadCapture,
      notifyStoreStaff: purchaseBoundary.notifyStoreStaff,
    };
  } catch (error) {
    console.error("Failed to generate Gemini sales reply. Falling back.", error);

    const fallbackDraft = buildFallbackSalesAgentReply(salesAgentInput);
    const leadCaptureIntent = await leadCaptureIntentDetector({
      activeProduct: input.activeProduct,
      alternativeProducts,
      draft: fallbackDraft,
      history: trimmedHistory,
    });
    const purchaseBoundary = applyStoreHandoffDecision({
      activeProduct: input.activeProduct,
      draft: fallbackDraft,
      shouldNotifyStoreStaff: leadCaptureIntent.shouldNotifyStoreStaff,
    });
    const leadCapture = resolveLeadCaptureInstruction({
      activeProduct: input.activeProduct,
      alternativeProducts,
      leadCaptureBenefit:
        leadCaptureIntent.leadCaptureBenefit ??
        (purchaseBoundary.notifyStoreStaff ? "seller-follow-up" : null),
      language: purchaseBoundary.draft.language,
      leadCaptureState: input.leadCaptureState,
    });
    const draft = attachLeadCaptureAnnouncement({
      draft: purchaseBoundary.draft,
      leadCapture,
    });

    return {
      draft,
      grounding: externalResearch?.grounding ?? null,
      leadCapture,
      notifyStoreStaff: purchaseBoundary.notifyStoreStaff,
    };
  }
}

export { selectRelevantComparisonProducts };

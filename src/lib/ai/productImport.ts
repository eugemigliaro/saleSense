import "server-only";

import { z } from "zod";

import { generateGeminiJsonWithMetadata } from "@/lib/ai/geminiClient";
import type { ProductImportDraft, ProductImportDraftPayload } from "@/types/api";

const PRODUCT_IMPORT_RESPONSE_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    brand: {
      type: "string",
    },
    category: {
      type: "string",
    },
    comparisonSnippetMarkdown: {
      type: "string",
    },
    detailsMarkdown: {
      type: "string",
    },
    idleMediaUrl: {
      type: ["string", "null"],
    },
    name: {
      type: "string",
    },
    sourceUrls: {
      items: {
        type: "string",
      },
      type: "array",
    },
  },
  required: [
    "name",
    "brand",
    "category",
    "detailsMarkdown",
    "comparisonSnippetMarkdown",
    "idleMediaUrl",
    "sourceUrls",
  ],
  type: "object",
} as const;

const productImportDraftSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(80),
  comparisonSnippetMarkdown: z.string().trim().min(1).max(4_000),
  detailsMarkdown: z.string().trim().min(1).max(20_000),
  idleMediaUrl: z
    .string()
    .trim()
    .url()
    .nullable(),
  name: z.string().trim().min(1).max(120),
  sourceUrls: z.array(z.string().trim().url()).min(1).max(20),
});

const PRODUCT_IMPORT_SYSTEM_INSTRUCTION = [
  "You turn product web pages into a clean SaleSense product draft.",
  "Be generic across product categories.",
  "Use only the provided URL content as source material.",
  "Do not invent pricing, stock, store policy, or unsupported claims.",
  "detailsMarkdown should be standardized for a retail salesperson and include: summary, best fit, key strengths, tradeoffs, try-it-in-store ideas, and comparison anchors.",
  "comparisonSnippetMarkdown should be a short comparison-oriented summary that other agents can use to decide whether this product is worth considering.",
  "idleMediaUrl should be null if you cannot infer a confident public hero image URL.",
  "Return only valid JSON that matches the required schema.",
].join(" ");

function getUrlMetadataEntries(metadata: unknown) {
  return metadata &&
    typeof metadata === "object" &&
    "urlMetadata" in metadata &&
    Array.isArray(metadata.urlMetadata)
    ? metadata.urlMetadata
    : [];
}

function normalizeUrlImportSources(metadata: unknown) {
  return getUrlMetadataEntries(metadata)
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const url =
        "retrievedUrl" in entry && typeof entry.retrievedUrl === "string"
          ? entry.retrievedUrl
          : null;
      const status =
        "urlRetrievalStatus" in entry && typeof entry.urlRetrievalStatus === "string"
          ? entry.urlRetrievalStatus
          : "URL_RETRIEVAL_STATUS_UNSPECIFIED";

      if (!url) {
        return null;
      }

      return {
        status,
        url,
      };
    })
    .filter((entry): entry is { status: string; url: string } => Boolean(entry));
}

function buildWarnings(
  sources: Array<{
    status: string;
    url: string;
  }>,
) {
  return sources
    .filter((source) => source.status !== "URL_RETRIEVAL_STATUS_SUCCESS")
    .map((source) => {
      switch (source.status) {
        case "URL_RETRIEVAL_STATUS_PAYWALL":
          return `Could not read ${source.url} because it is behind a paywall.`;
        case "URL_RETRIEVAL_STATUS_UNSAFE":
          return `Skipped ${source.url} because Gemini marked it as unsafe.`;
        case "URL_RETRIEVAL_STATUS_ERROR":
          return `Could not retrieve ${source.url}.`;
        default:
          return `Skipped ${source.url}.`;
      }
    });
}

function buildProductImportPrompt(sourceUrls: string[]) {
  return [
    "Use URL context on these source URLs and create a normalized SaleSense product draft:",
    ...sourceUrls.map((url) => `- ${url}`),
  ].join("\n");
}

export async function generateProductImportDraft(sourceUrls: string[]) {
  const result = await generateGeminiJsonWithMetadata<unknown>(
    buildProductImportPrompt(sourceUrls),
    {
      responseJsonSchema: PRODUCT_IMPORT_RESPONSE_JSON_SCHEMA,
      systemInstruction: PRODUCT_IMPORT_SYSTEM_INSTRUCTION,
      tools: [{ urlContext: {} }],
    },
  );
  const sources = normalizeUrlImportSources(result.urlContextMetadata);
  const warnings = buildWarnings(sources);
  const draft = productImportDraftSchema.parse(result.data);
  const successfulSourceUrls = new Set(
    sources
      .filter((source) => source.status === "URL_RETRIEVAL_STATUS_SUCCESS")
      .map((source) => source.url),
  );

  return {
    draft: {
      ...draft,
      sourceUrls: draft.sourceUrls.filter((url) => successfulSourceUrls.has(url)),
    } satisfies ProductImportDraft,
    sources,
    warnings,
  } satisfies ProductImportDraftPayload;
}

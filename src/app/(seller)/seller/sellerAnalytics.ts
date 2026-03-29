import type {
  ConversationAnalytics,
  ConversationFeedbackSentiment,
  Lead,
  Product,
} from "@/types/domain";

const HIGH_BUY_PROBABILITY_THRESHOLD = 0.8;

interface DashboardBreakdownItem {
  count: number;
  label: string;
}

export interface FaqTopicMetric {
  count: number;
  example: string | null;
  label: string;
}

export interface SellerDashboardMetrics {
  averageConversationDurationSeconds: number;
  clientFeedback: DashboardBreakdownItem[];
  confirmedSalesCount: number;
  confirmedSalesRate: number;
  confirmedSalesRemainingCount: number;
  contactChannelCaptureCount: number;
  contactChannelCaptureRate: number;
  contactChannelMissingCount: number;
  faqTopics: FaqTopicMetric[];
  highIntentAiInferredSales: number;
  highIntentConversationCount: number;
  highIntentConversationRate: number;
  highIntentStoreConfirmedSales: number;
  redirectedConversationCount: number;
  redirectedConversationRate: number;
  totalConversations: number;
  topRedirectTargets: DashboardBreakdownItem[];
}

interface SellerDashboardMetricOptions {
  capturedContactCount?: number;
  confirmedSaleCount?: number;
  productIds?: string[];
}

interface FaqLibraryEntry {
  examples: string[];
  keywords: string[];
  topic: string;
}

const FAQ_LIBRARY: FaqLibraryEntry[] = [
  {
    topic: "Battery life",
    keywords: ["battery", "charge", "lasting", "all day"],
    examples: [
      "How long does the battery last during a normal workday?",
      "Will it make it through a full day without charging?",
    ],
  },
  {
    topic: "Camera quality",
    keywords: ["camera", "photo", "video", "zoom", "portrait"],
    examples: [
      "How good is the camera in low light?",
      "Is the zoom actually useful compared with the other models?",
    ],
  },
  {
    topic: "Performance",
    keywords: ["speed", "performance", "gaming", "lag", "processor"],
    examples: [
      "Will it stay fast if I multitask a lot?",
      "Can it handle gaming and heavier apps smoothly?",
    ],
  },
  {
    topic: "Storage",
    keywords: ["storage", "memory", "space", "128", "256", "512"],
    examples: [
      "Is 256GB enough if I keep a lot of photos and videos?",
      "What storage option makes the most sense long term?",
    ],
  },
  {
    topic: "Price vs value",
    keywords: ["price", "worth", "value", "budget", "cost"],
    examples: [
      "Is this model really worth the price jump?",
      "What do I actually gain for the extra money?",
    ],
  },
  {
    topic: "Durability",
    keywords: ["durable", "drop", "glass", "water", "scratch"],
    examples: [
      "How durable is it if I do not use a case right away?",
      "Is it actually resistant to water and daily wear?",
    ],
  },
  {
    topic: "Display quality",
    keywords: ["screen", "display", "brightness", "refresh", "oled"],
    examples: [
      "Is the screen bright enough outdoors?",
      "Do you really notice the display upgrade in daily use?",
    ],
  },
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function sortBreakdown(items: DashboardBreakdownItem[]) {
  return [...items].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.label.localeCompare(right.label);
  });
}

function buildFaqPayload(lead: Lead, seed: number) {
  const searchableText = [
    lead.aiSummary ?? "",
    lead.inferredInterest ?? "",
    lead.nextBestProduct ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const detectedEntries = FAQ_LIBRARY.filter((entry) =>
    entry.keywords.some((keyword) => searchableText.includes(keyword)),
  );
  const selectedEntries =
    detectedEntries.length > 0
      ? detectedEntries.slice(0, 3)
      : [
          FAQ_LIBRARY[seed % FAQ_LIBRARY.length],
          FAQ_LIBRARY[(seed + 2) % FAQ_LIBRARY.length],
        ];
  const uniqueEntries = selectedEntries.filter(
    (entry, index, array) =>
      array.findIndex((candidate) => candidate.topic === entry.topic) === index,
  );

  return {
    faqExamples: uniqueEntries.map(
      (entry, index) => entry.examples[(seed + index) % entry.examples.length],
    ),
    faqTopics: uniqueEntries.map((entry) => entry.topic),
  };
}

function formatFeedbackLabel(sentiment: ConversationFeedbackSentiment) {
  switch (sentiment) {
    case "positive":
      return "Positive";
    case "negative":
      return "Negative";
    default:
      return "Neutral";
  }
}

export function buildMockConversationAnalytics(
  leads: Lead[],
  products: Product[],
): ConversationAnalytics[] {
  const productByName = new Map(products.map((product) => [product.name, product]));

  return leads.map((lead) => {
    const seed = hashString(`${lead.id}:${lead.customerEmail}:${lead.createdAt}`);
    const durationSeconds = 180 + (seed % 900);
    const messageCount = Math.max(6, Math.round(durationSeconds / 45));
    const baseProbability =
      0.48 +
      (seed % 24) / 100 +
      (lead.aiSummary ? 0.08 : 0) +
      (lead.inferredInterest ? 0.12 : 0) -
      (lead.nextBestProduct ? 0.06 : 0);
    const buyProbability = clamp(baseProbability, 0.35, 0.97);
    const saleOutcome =
      buyProbability >= 0.9 && seed % 2 === 0
        ? "store_confirmed"
        : buyProbability >= HIGH_BUY_PROBABILITY_THRESHOLD
          ? "ai_inferred"
          : "none";
    const feedbackSentiment: ConversationFeedbackSentiment =
      buyProbability >= 0.85
        ? "positive"
        : seed % 5 === 0
          ? "negative"
          : "neutral";
    const feedbackScore =
      feedbackSentiment === "positive"
        ? 5
        : feedbackSentiment === "neutral"
          ? 3
          : 2;
    const redirectedToOtherProduct =
      Boolean(lead.nextBestProduct?.trim()) || seed % 5 === 0;
    const redirectTargetProductId = redirectedToOtherProduct
      ? productByName.get(lead.nextBestProduct ?? "")?.id ??
        products.find((product) => product.id !== lead.productId)?.id ??
        null
      : null;
    const endedAt = new Date(lead.createdAt);
    const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
    const faqPayload = buildFaqPayload(lead, seed);

    return {
      buyProbability,
      chatSessionId: `mock-${lead.id}`,
      durationSeconds,
      endedAt: endedAt.toISOString(),
      faqExamples: faqPayload.faqExamples,
      faqTopics: faqPayload.faqTopics,
      feedbackScore,
      feedbackSentiment,
      manualSaleConfirmed: lead.isSaleConfirmed,
      messageCount,
      productId: lead.productId,
      redirectedToOtherProduct,
      redirectTargetProductId,
      saleOutcome,
      startedAt: startedAt.toISOString(),
      storeId: lead.storeId,
    };
  });
}

export function filterConversationAnalyticsByProductIds(
  analytics: ConversationAnalytics[],
  productIds: string[] = [],
) {
  if (productIds.length === 0) {
    return analytics;
  }

  const selectedProductIds = new Set(productIds);

  return analytics.filter((entry) => selectedProductIds.has(entry.productId));
}

export function buildSellerDashboardMetrics(
  analytics: ConversationAnalytics[],
  products: Product[],
  options: SellerDashboardMetricOptions = {},
): SellerDashboardMetrics {
  const filteredAnalytics = filterConversationAnalyticsByProductIds(
    analytics,
    options.productIds,
  );
  const totalConversations = filteredAnalytics.length;
  const capturedContactCount = Math.min(
    options.capturedContactCount ?? 0,
    totalConversations,
  );
  const confirmedSalesCount = Math.min(
    options.confirmedSaleCount ??
      filteredAnalytics.filter((entry) => entry.manualSaleConfirmed).length,
    totalConversations,
  );
  const contactChannelMissingCount = Math.max(
    totalConversations - capturedContactCount,
    0,
  );
  const confirmedSalesRemainingCount = Math.max(
    totalConversations - confirmedSalesCount,
    0,
  );
  const productNameById = new Map(products.map((product) => [product.id, product.name]));
  const feedbackCounts = new Map<string, number>();
  const faqTopicMap = new Map<string, { count: number; example: string | null }>();
  const redirectTargetCounts = new Map<string, number>();
  let durationTotal = 0;
  let redirectedConversationCount = 0;
  let highIntentConversationCount = 0;
  let highIntentAiInferredSales = 0;
  let highIntentStoreConfirmedSales = 0;

  feedbackCounts.set("Positive", 0);
  feedbackCounts.set("Neutral", 0);
  feedbackCounts.set("Negative", 0);

  for (const entry of filteredAnalytics) {
    if (entry.durationSeconds != null) {
      durationTotal += entry.durationSeconds;
    }

    if ((entry.buyProbability ?? 0) >= HIGH_BUY_PROBABILITY_THRESHOLD) {
      highIntentConversationCount += 1;

      if (entry.manualSaleConfirmed || entry.saleOutcome === "store_confirmed") {
        highIntentStoreConfirmedSales += 1;
      } else if (entry.saleOutcome === "ai_inferred") {
        highIntentAiInferredSales += 1;
      }
    }

    if (entry.feedbackSentiment) {
      const feedbackLabel = formatFeedbackLabel(entry.feedbackSentiment);

      feedbackCounts.set(
        feedbackLabel,
        (feedbackCounts.get(feedbackLabel) ?? 0) + 1,
      );
    }

    if (entry.redirectedToOtherProduct) {
      redirectedConversationCount += 1;

      if (entry.redirectTargetProductId) {
        const redirectTargetLabel =
          productNameById.get(entry.redirectTargetProductId) ?? "Other product";

        redirectTargetCounts.set(
          redirectTargetLabel,
          (redirectTargetCounts.get(redirectTargetLabel) ?? 0) + 1,
        );
      }
    }

    entry.faqTopics.forEach((topic, index) => {
      const currentTopic = faqTopicMap.get(topic);
      const example = entry.faqExamples[index] ?? null;

      if (!currentTopic) {
        faqTopicMap.set(topic, {
          count: 1,
          example,
        });

        return;
      }

      faqTopicMap.set(topic, {
        count: currentTopic.count + 1,
        example: currentTopic.example ?? example,
      });
    });
  }

  return {
    averageConversationDurationSeconds:
      totalConversations > 0 ? Math.round(durationTotal / totalConversations) : 0,
    clientFeedback: sortBreakdown(
      Array.from(feedbackCounts.entries()).map(([label, count]) => ({
        count,
        label,
      })),
    ),
    confirmedSalesCount,
    confirmedSalesRate:
      totalConversations > 0 ? confirmedSalesCount / totalConversations : 0,
    confirmedSalesRemainingCount,
    contactChannelCaptureCount: capturedContactCount,
    contactChannelCaptureRate:
      totalConversations > 0 ? capturedContactCount / totalConversations : 0,
    contactChannelMissingCount,
    faqTopics: [...faqTopicMap.entries()]
      .map(([label, value]) => ({
        count: value.count,
        example: value.example,
        label,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.label.localeCompare(right.label);
      })
      .slice(0, 5),
    highIntentAiInferredSales,
    highIntentConversationCount,
    highIntentConversationRate:
      totalConversations > 0 ? highIntentConversationCount / totalConversations : 0,
    highIntentStoreConfirmedSales,
    redirectedConversationCount,
    redirectedConversationRate:
      totalConversations > 0 ? redirectedConversationCount / totalConversations : 0,
    totalConversations,
    topRedirectTargets: sortBreakdown(
      Array.from(redirectTargetCounts.entries()).map(([label, count]) => ({
        count,
        label,
      })),
    ).slice(0, 3),
  };
}

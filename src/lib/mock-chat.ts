import type {
  ChatMessage,
  Product,
} from "@/types/domain";
import type { SendChatHistoryMessageInput } from "@/lib/schemas";

const DETAILS_PREVIEW_LENGTH = 180;
const COMPARISON_PREVIEW_LENGTH = 140;

function createAssistantMessage(content: string): ChatMessage {
  return {
    content,
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    role: "assistant",
  };
}

function getPreview(markdown: string, maxLength: number) {
  const plainText = markdown
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength).trimEnd()}...`;
}

function needsComparison(customerMessage: string) {
  return /compare|vs|versus|alternative|other|difference/i.test(customerMessage);
}

function needsPricing(customerMessage: string) {
  return /price|pricing|cost|expensive|cheap/i.test(customerMessage);
}

export function buildChatGreeting(product: Product) {
  const productLabel = `${product.brand} ${product.name}`;

  return createAssistantMessage(
    `Hi, I'm the SaleSense guide for the ${productLabel}. Tell me what matters most in a ${product.category.toLowerCase()}, and I'll help you decide if this demo is a fit.`,
  );
}

export function buildMockAssistantReply({
  customerMessage,
  history,
  product,
}: {
  customerMessage: string;
  history: SendChatHistoryMessageInput[];
  product: Product;
}) {
  const productLabel = `${product.brand} ${product.name}`;
  const detailsPreview = getPreview(
    product.detailsMarkdown,
    DETAILS_PREVIEW_LENGTH,
  );
  const comparisonPreview = getPreview(
    product.comparisonSnippetMarkdown,
    COMPARISON_PREVIEW_LENGTH,
  );
  const hasHistory = history.length > 0;
  const responseParts = [
    hasHistory
      ? `Based on what you've told me so far, the ${productLabel} still looks relevant if you want a ${product.category.toLowerCase()} you can try right now.`
      : `The ${productLabel} is a strong option if you want a ${product.category.toLowerCase()} you can explore on the spot.`,
  ];

  if (needsPricing(customerMessage)) {
    responseParts.push(
      "I do not have live store pricing in this first-pass assistant yet, but I can help you evaluate fit, features, and what to compare before you buy.",
    );
  } else if (detailsPreview.length > 0) {
    responseParts.push(detailsPreview);
  }

  if (needsComparison(customerMessage) && comparisonPreview.length > 0) {
    responseParts.push(`For comparison, ${comparisonPreview}`);
  }

  responseParts.push(
    "Tell me the one or two features you care about most, and I'll narrow the pitch further.",
  );

  return createAssistantMessage(responseParts.join(" "));
}

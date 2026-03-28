import type { ChatMessage } from "@/types/domain";

export function buildPreviewGreeting(productName: string, category: string) {
  return `Hi, I'm ready to help you evaluate the ${productName}. Tell me what matters most in a ${category.toLowerCase()}, and I'll guide the comparison.`;
}

function extractMarkdownBulletLines(detailsMarkdown: string) {
  return detailsMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/\*\*/g, ""))
    .filter(Boolean);
}

function extractMarkdownParagraphs(detailsMarkdown: string) {
  return detailsMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#") && !/^[-*]\s+/.test(line))
    .map((line) => line.replace(/\*\*/g, ""))
    .filter(Boolean);
}

export function buildMarketingHighlights(
  detailsMarkdown: string,
  comparisonSnippet: string,
) {
  const bulletLines = extractMarkdownBulletLines(detailsMarkdown);
  const paragraphLines = extractMarkdownParagraphs(detailsMarkdown);
  const snippetParts = comparisonSnippet
    .split(/[.;]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const highlights = [...bulletLines, ...snippetParts].slice(0, 4);

  if (highlights.length > 0) {
    return highlights;
  }

  return paragraphLines.slice(0, 4);
}

export function buildMarketingSummary(
  detailsMarkdown: string,
  comparisonSnippet: string,
) {
  const paragraphLines = extractMarkdownParagraphs(detailsMarkdown);

  if (paragraphLines.length > 0) {
    return paragraphLines[0];
  }

  return comparisonSnippet;
}

export function isImageUrl(url: string | null) {
  if (!url) {
    return false;
  }

  return /\.(avif|gif|jpe?g|png|webp|svg)$/i.test(url);
}

export function buildMockReply(
  messageCount: number,
  productName: string,
  brandName: string,
  category: string,
) {
  const replies = [
    `The ${brandName} ${productName} is strongest when you want a polished ${category.toLowerCase()} experience without friction. If you tell me what you care about most, I can narrow the pitch quickly.`,
    `A good next step is to try the core interaction on this device right now. Pay attention to speed, feel, and whether the interface feels natural for your day-to-day use.`,
    `If you are comparing options in-store, I can explain where the ${productName} is a stronger fit and where another product might make more sense. I will keep the comparison grounded.`,
    `That is a common buying question. I would frame the ${productName} around overall experience first, then decide whether you need a sharper comparison on performance, camera, or value.`,
  ];

  return replies[messageCount % replies.length];
}

export function createMessage(
  role: ChatMessage["role"],
  content: string,
): ChatMessage {
  return {
    content,
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    role,
  };
}

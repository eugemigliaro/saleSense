import type { ChatMessage, Product } from "@/types/domain";

function normalizeCategoryLabel(category: string) {
  const trimmed = category.trim();

  return trimmed.length > 0 ? trimmed.toLowerCase() : "setup";
}

function createAssistantMessage(content: string): ChatMessage {
  return {
    content,
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    role: "assistant",
  };
}

export function buildChatGreeting(product: Product) {
  const categoryLabel = normalizeCategoryLabel(product.category);

  return createAssistantMessage(
    `Hi, what matters most to you in a ${categoryLabel} right now?`,
  );
}

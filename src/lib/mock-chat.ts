import type { ChatMessage, Product } from "@/types/domain";

function createAssistantMessage(content: string): ChatMessage {
  return {
    content,
    createdAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    role: "assistant",
  };
}

export function buildChatGreeting(product: Product) {
  const productLabel = `${product.brand} ${product.name}`;

  return createAssistantMessage(
    `Hi there! I'm your virtual sales assistant for the ${productLabel}. I can tell you all about it, help compare it with other options, or answer any questions. What brings you in today?`,
  );
}

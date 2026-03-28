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
    `Hi, I'm the SaleSense guide for the ${productLabel}. Tell me what matters most in a ${product.category.toLowerCase()}, and I'll help you decide if this demo is a fit.`,
  );
}

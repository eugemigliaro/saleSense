import type { ChatMessage } from "@/types/domain";

export function buildPreviewGreeting(productName: string, category: string) {
  return `Hi, what are you hoping to improve in a ${category.toLowerCase()} like ${productName}?`;
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

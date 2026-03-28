"use client";

import { KioskChatView } from "./KioskChatView";
import { KioskIdleView } from "./KioskIdleView";
import { KioskLeadView } from "./KioskLeadView";
import { KioskThanksView } from "./KioskThanksView";
import { buildMarketingHighlights, buildMarketingSummary, isImageUrl } from "./kioskHelpers";
import type { KioskExperienceProps } from "./kioskTypes";
import { useKioskExperience } from "./useKioskExperience";

export default function KioskExperience({
  brandName,
  category,
  comparisonSnippet,
  deviceSessionId,
  detailsMarkdown,
  idleMediaUrl,
  productId,
  productName,
  sourceLabel,
}: KioskExperienceProps) {
  const experience = useKioskExperience({
    brandName,
    category,
    deviceSessionId,
    productId,
    productName,
  });
  const marketingHighlights = buildMarketingHighlights(
    detailsMarkdown,
    comparisonSnippet,
  );
  const marketingSummary = buildMarketingSummary(
    detailsMarkdown,
    comparisonSnippet,
  );
  const showImagePreview = isImageUrl(idleMediaUrl);

  if (experience.state === "idle") {
    return (
      <KioskIdleView
        brandName={brandName}
        productName={productName}
        sourceLabel={sourceLabel}
        onStart={experience.startExperience}
      />
    );
  }

  if (experience.state === "lead") {
    return (
      <KioskLeadView
        customerEmail={experience.customerEmail}
        customerName={experience.customerName}
        customerPhone={experience.customerPhone}
        isSubmittingLead={experience.isSubmittingLead}
        leadError={experience.leadError}
        productName={productName}
        onCustomerEmailChange={experience.setCustomerEmail}
        onCustomerNameChange={experience.setCustomerName}
        onCustomerPhoneChange={experience.setCustomerPhone}
        onReset={experience.resetExperience}
        onSubmit={experience.submitLead}
      />
    );
  }

  if (experience.state === "thanks") {
    return <KioskThanksView />;
  }

  return (
    <KioskChatView
      brandName={brandName}
      category={category}
      chatError={experience.chatError}
      comparisonSnippet={comparisonSnippet}
      deviceSessionId={deviceSessionId}
      draft={experience.draft}
      idleMediaUrl={idleMediaUrl}
      isTyping={experience.isTyping}
      marketingHighlights={marketingHighlights}
      marketingSummary={marketingSummary}
      messages={experience.messages}
      productName={productName}
      showImagePreview={showImagePreview}
      sourceLabel={sourceLabel}
      onDraftChange={experience.setDraft}
      onEndSession={experience.transitionToLeadCapture}
      onSendMessage={experience.sendMessage}
    />
  );
}

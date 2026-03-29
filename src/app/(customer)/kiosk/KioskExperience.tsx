"use client";

import { AnimatePresence } from "framer-motion";

import { KioskChatView } from "./KioskChatView";
import { KioskIdleView } from "./KioskIdleView";
import { KioskLeadView } from "./KioskLeadView";
import { KioskThanksView } from "./KioskThanksView";
import type { KioskExperienceProps } from "./kioskTypes";
import { useKioskExperience } from "./useKioskExperience";

export default function KioskExperience({
  brandName,
  category,
  deviceSessionId,
  idleMediaUrl,
  productId,
  productName,
}: KioskExperienceProps) {
  const experience = useKioskExperience({
    brandName,
    category,
    deviceSessionId,
    productId,
    productName,
  });

  return (
    <AnimatePresence mode="wait">
      {experience.state === "idle" ? (
        <KioskIdleView
          key="idle"
          brandName={brandName}
          idleMediaUrl={idleMediaUrl}
          productName={productName}
          onStart={experience.startExperience}
        />
      ) : null}

      {experience.state === "chat" ? (
        <KioskChatView
          key="chat"
          activeGrounding={experience.activeGrounding}
          chatError={experience.chatError}
          draft={experience.draft}
          groundingByMessageId={experience.groundingByMessageId}
          idleMediaUrl={idleMediaUrl}
          isAssistantSpeaking={experience.isAssistantSpeaking}
          isAwaitingReply={experience.isAwaitingReply}
          isVoiceAvailable={experience.isVoiceAvailable}
          isVoiceRecording={experience.isVoiceRecording}
          messages={experience.messages}
          onCancelVoiceInput={experience.cancelVoiceInput}
          onCloseGrounding={experience.closeGrounding}
          onDraftChange={experience.setDraft}
          onOpenGroundingForMessage={experience.openGroundingForMessage}
          onSendMessage={experience.sendMessage}
          onVoicePrimaryAction={experience.startVoiceInput}
          voiceState={experience.voiceState}
        />
      ) : null}

      {experience.state === "lead" ? (
        <KioskLeadView
          key="lead"
          customerEmail={experience.customerEmail}
          customerName={experience.customerName}
          customerPhone={experience.customerPhone}
          isSubmittingLead={experience.isSubmittingLead}
          leadError={experience.leadError}
          onCustomerEmailChange={experience.setCustomerEmail}
          onCustomerNameChange={experience.setCustomerName}
          onCustomerPhoneChange={experience.setCustomerPhone}
          onReset={experience.resetExperience}
          onSubmit={experience.submitLead}
        />
      ) : null}

      {experience.state === "thanks" ? <KioskThanksView key="thanks" /> : null}
    </AnimatePresence>
  );
}

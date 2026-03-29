"use client";

import { AnimatePresence } from "framer-motion";

import { KioskChatView } from "./KioskChatView";
import { KioskFeedbackView } from "./KioskFeedbackView";
import { KioskIdleView } from "./KioskIdleView";
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
          inlineLeadCaptureEmail={experience.inlineLeadCaptureEmail}
          inlineLeadCaptureError={experience.inlineLeadCaptureError}
          inlineLeadCaptureInstruction={experience.inlineLeadCaptureInstruction}
          inlineLeadCaptureState={experience.inlineLeadCaptureState}
          isAssistantSpeaking={experience.isAssistantSpeaking}
          isAwaitingReply={experience.isAwaitingReply}
          isSubmittingInlineLead={experience.isSubmittingInlineLead}
          isVoiceAvailable={experience.isVoiceAvailable}
          isVoiceRecording={experience.isVoiceRecording}
          messages={experience.messages}
          onDismissInlineLeadCapture={experience.dismissInlineLeadCapture}
          onCancelVoiceInput={experience.cancelVoiceInput}
          onCloseGrounding={experience.closeGrounding}
          onDraftChange={experience.setDraft}
          onInlineLeadCaptureEmailChange={experience.setInlineLeadCaptureEmail}
          onSubmitInlineLeadCapture={experience.submitInlineLeadCapture}
          onOpenGroundingForMessage={experience.openGroundingForMessage}
          onSendMessage={experience.sendMessage}
          onVoicePrimaryAction={experience.startVoiceInput}
          voiceState={experience.voiceState}
        />
      ) : null}

      {experience.state === "feedback" ? (
        <KioskFeedbackView
          key="feedback"
          feedbackError={experience.feedbackError}
          isSubmittingFeedback={experience.isSubmittingFeedback}
          onSkip={experience.skipFeedback}
          onSubmit={experience.submitFeedback}
        />
      ) : null}

      {experience.state === "thanks" ? <KioskThanksView key="thanks" /> : null}
    </AnimatePresence>
  );
}

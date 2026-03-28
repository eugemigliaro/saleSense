"use client";

import {
  GoogleGenAI,
  type FunctionCall,
  type LiveServerMessage,
  Modality,
  type Session as GeminiLiveSession,
  ThinkingLevel,
  Type,
  type LiveConnectConfig,
} from "@google/genai";
import { useEffect, useRef, useState } from "react";

import type { GeminiLiveConfigPayload } from "@/types/api";

import type { KioskLiveToolCallResult, VoiceSessionState } from "./kioskTypes";
import {
  createRealtimeAudioChunk,
  createPlaybackAudioBuffer,
  type LiveAudioInlineData,
} from "./liveVoiceAudio";
import { createKioskLiveToken, sendKioskLiveToolCall } from "./kioskApi";

interface UseLiveVoiceSessionInput {
  chatSessionId: string | null;
  onResolvedTurn: (
    result: KioskLiveToolCallResult,
    pendingUserMessageId: string | null,
  ) => void;
  onVoiceError: (message: string) => void;
}

interface PendingTextTurn {
  pendingUserMessageId: string | null;
  reject: (error: unknown) => void;
  resolve: () => void;
}

type LiveRealtimeAudioInput = NonNullable<
  Parameters<GeminiLiveSession["sendRealtimeInput"]>[0]["audio"]
>;

function getLiveErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

function toSdkLiveConfig(payload: GeminiLiveConfigPayload): LiveConnectConfig {
  return {
    inputAudioTranscription: payload.inputAudioTranscription,
    maxOutputTokens: payload.generationConfig.maxOutputTokens,
    outputAudioTranscription: payload.outputAudioTranscription,
    responseModalities: payload.responseModalities.map(() => Modality.AUDIO),
    systemInstruction: payload.systemInstruction,
    temperature: payload.temperature,
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.MINIMAL,
    },
    tools: payload.tools.map((tool) => ({
      functionDeclarations: tool.functionDeclarations.map((declaration) => ({
        description: declaration.description,
        name: declaration.name,
        parameters: {
          additionalProperties: declaration.parameters.additionalProperties,
          properties: Object.fromEntries(
            Object.entries(declaration.parameters.properties).map(
              ([propertyName, property]) => [
                propertyName,
                {
                  ...(property.description
                    ? { description: property.description }
                    : {}),
                  type: Type.STRING,
                },
              ],
            ),
          ),
          required: declaration.parameters.required,
          type: Type.OBJECT,
        },
      })),
    })),
  };
}

function isLiveAudioInlineData(value: unknown): value is LiveAudioInlineData {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LiveAudioInlineData).mimeType === "string" &&
    (value as LiveAudioInlineData).mimeType!.startsWith("audio/")
  );
}

async function speakOpenerWithBrowserVoice(text: string) {
  if (
    typeof window === "undefined" ||
    typeof SpeechSynthesisUtterance === "undefined" ||
    !window.speechSynthesis
  ) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);

  await new Promise<void>((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = () =>
      reject(new Error("Failed to play the opening voice prompt."));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function useLiveVoiceSession({
  chatSessionId,
  onResolvedTurn,
  onVoiceError,
}: UseLiveVoiceSessionInput) {
  const [voiceState, setVoiceState] = useState<VoiceSessionState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const processorSinkRef = useRef<GainNode | null>(null);
  const playbackCursorRef = useRef(0);
  const queuedPlaybackCountRef = useRef(0);
  const pendingAssistantTurnCompleteRef = useRef(false);
  const captureEnabledRef = useRef(false);
  const connectingRef = useRef(false);
  const shuttingDownRef = useRef(false);
  const activeChatSessionIdRef = useRef<string | null>(null);
  const pendingTextTurnRef = useRef<PendingTextTurn | null>(null);
  const cleanupSessionRef = useRef<() => Promise<void>>(async () => undefined);

  function resetPlaybackState() {
    playbackCursorRef.current = 0;
    queuedPlaybackCountRef.current = 0;
    pendingAssistantTurnCompleteRef.current = false;
  }

  function enableListening() {
    if (
      voiceState === "fallback" ||
      !liveSessionRef.current ||
      !processorRef.current ||
      !microphoneStreamRef.current
    ) {
      return;
    }

    captureEnabledRef.current = true;
    setVoiceState("customer-listening");
  }

  function disableListening() {
    captureEnabledRef.current = false;
  }

  function rejectPendingTextTurn(error: unknown) {
    if (!pendingTextTurnRef.current) {
      return;
    }

    pendingTextTurnRef.current.reject(error);
    pendingTextTurnRef.current = null;
  }

  function resolvePendingTextTurn() {
    if (!pendingTextTurnRef.current) {
      return;
    }

    pendingTextTurnRef.current.resolve();
    pendingTextTurnRef.current = null;
  }

  async function queuePlaybackBlob(audioBlob: LiveAudioInlineData) {
    const audioContext = outputAudioContextRef.current;

    if (!audioContext) {
      return;
    }

    await audioContext.resume();

    const audioBuffer = await createPlaybackAudioBuffer(audioContext, audioBlob);
    const sourceNode = audioContext.createBufferSource();

    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);

    const scheduledStartTime = Math.max(
      audioContext.currentTime,
      playbackCursorRef.current,
    );

    queuedPlaybackCountRef.current += 1;
    playbackCursorRef.current = scheduledStartTime + audioBuffer.duration;

    sourceNode.onended = () => {
      queuedPlaybackCountRef.current = Math.max(
        0,
        queuedPlaybackCountRef.current - 1,
      );

      if (
        queuedPlaybackCountRef.current === 0 &&
        pendingAssistantTurnCompleteRef.current
      ) {
        pendingAssistantTurnCompleteRef.current = false;
        enableListening();
      }
    };

    sourceNode.start(scheduledStartTime);
  }

  async function handleToolCalls(functionCalls: FunctionCall[]) {
    const activeChatSessionId = activeChatSessionIdRef.current ?? chatSessionId;

    if (!activeChatSessionId) {
      throw new Error("Chat session is unavailable for live voice.");
    }

    disableListening();
    setVoiceState("assistant-speaking");

    const toolResponses = await Promise.all(
      functionCalls.map(async (functionCall) => {
        const customerTranscript =
          typeof functionCall.args?.customerTranscript === "string"
            ? functionCall.args.customerTranscript
            : "";

        const result = await sendKioskLiveToolCall(activeChatSessionId, {
          callId: functionCall.id ?? crypto.randomUUID(),
          customerTranscript,
        });

        const pendingUserMessageId =
          pendingTextTurnRef.current?.pendingUserMessageId ?? null;

        onResolvedTurn(result, pendingUserMessageId);
        resolvePendingTextTurn();

        return result.functionResponse;
      }),
    );

    liveSessionRef.current?.sendToolResponse({
      functionResponses: toolResponses,
    });
  }

  async function handleLiveMessage(message: LiveServerMessage) {
    if (message.toolCall?.functionCalls?.length) {
      try {
        await handleToolCalls(message.toolCall.functionCalls);
      } catch (error) {
        const liveErrorMessage = getLiveErrorMessage(
          error,
          "Voice is unavailable right now. Continue with typed chat.",
        );

        setVoiceError(liveErrorMessage);
        setVoiceState("fallback");
        setIsVoiceEnabled(false);
        rejectPendingTextTurn(new Error(liveErrorMessage));
        onVoiceError(liveErrorMessage);
      }

      return;
    }

    const serverContent = message.serverContent;

    if (!serverContent) {
      return;
    }

    if (serverContent.interrupted) {
      resetPlaybackState();
      enableListening();
      return;
    }

    const modelParts = serverContent.modelTurn?.parts ?? [];
    const audioParts = modelParts
      .map((part) => part.inlineData)
      .filter(isLiveAudioInlineData);

    if (audioParts.length > 0) {
      disableListening();
      setVoiceState("assistant-speaking");

      await Promise.all(audioParts.map((part) => queuePlaybackBlob(part)));
    }

    if (serverContent.turnComplete) {
      pendingAssistantTurnCompleteRef.current = true;

      if (queuedPlaybackCountRef.current === 0) {
        pendingAssistantTurnCompleteRef.current = false;
        enableListening();
      }
    }
  }

  async function cleanupSession() {
    shuttingDownRef.current = true;
    disableListening();

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    liveSessionRef.current?.close();
    liveSessionRef.current = null;

    processorRef.current?.disconnect();
    processorRef.current = null;

    processorSinkRef.current?.disconnect();
    processorSinkRef.current = null;

    microphoneSourceRef.current?.disconnect();
    microphoneSourceRef.current = null;

    microphoneStreamRef.current?.getTracks().forEach((track) => track.stop());
    microphoneStreamRef.current = null;

    if (inputAudioContextRef.current) {
      await inputAudioContextRef.current.close().catch(() => undefined);
      inputAudioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
      await outputAudioContextRef.current.close().catch(() => undefined);
      outputAudioContextRef.current = null;
    }

    activeChatSessionIdRef.current = null;
    connectingRef.current = false;
    setIsVoiceEnabled(false);
    resetPlaybackState();
    rejectPendingTextTurn(new Error("Voice session closed."));
  }

  cleanupSessionRef.current = cleanupSession;

  async function connectMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    const inputAudioContext = new AudioContext();
    const outputAudioContext = new AudioContext();
    const sourceNode = inputAudioContext.createMediaStreamSource(stream);
    const processorNode = inputAudioContext.createScriptProcessor(4096, 1, 1);
    const sinkNode = inputAudioContext.createGain();

    await Promise.all([
      inputAudioContext.resume().catch(() => undefined),
      outputAudioContext.resume().catch(() => undefined),
    ]);

    sinkNode.gain.value = 0;

    processorNode.onaudioprocess = (event) => {
      event.outputBuffer.getChannelData(0).fill(0);

      if (!captureEnabledRef.current || !liveSessionRef.current) {
        return;
      }

      const inputBuffer = event.inputBuffer.getChannelData(0);

      if (!inputBuffer || inputBuffer.length === 0) {
        return;
      }

      const chunk = createRealtimeAudioChunk(
        new Float32Array(inputBuffer),
        event.inputBuffer.sampleRate,
      );

      liveSessionRef.current.sendRealtimeInput({
        audio: chunk as LiveRealtimeAudioInput,
      });
    };

    sourceNode.connect(processorNode);
    processorNode.connect(sinkNode);
    sinkNode.connect(inputAudioContext.destination);

    inputAudioContextRef.current = inputAudioContext;
    outputAudioContextRef.current = outputAudioContext;
    microphoneStreamRef.current = stream;
    microphoneSourceRef.current = sourceNode;
    processorRef.current = processorNode;
    processorSinkRef.current = sinkNode;
  }

  async function connect(nextChatSessionId?: string | null) {
    const targetChatSessionId = nextChatSessionId ?? chatSessionId;

    if (!targetChatSessionId || connectingRef.current) {
      return false;
    }

    if (
      activeChatSessionIdRef.current === targetChatSessionId &&
      liveSessionRef.current &&
      isVoiceEnabled
    ) {
      return true;
    }

    connectingRef.current = true;
    setVoiceError(null);
    setVoiceState("connecting");

    try {
      await cleanupSession();

      const liveToken = await createKioskLiveToken(targetChatSessionId);
      const ai = new GoogleGenAI({
        apiKey: liveToken.token,
        httpOptions: {
          apiVersion: "v1alpha",
        },
      });

      await connectMicrophone();
      shuttingDownRef.current = false;

      const session = await ai.live.connect({
        callbacks: {
          onclose: () => {
            if (shuttingDownRef.current) {
              return;
            }

            setVoiceState("fallback");
            setIsVoiceEnabled(false);
          },
          onerror: () => {
            if (shuttingDownRef.current) {
              return;
            }

            setVoiceError("Voice is unavailable right now. Continue with typed chat.");
            setVoiceState("fallback");
            setIsVoiceEnabled(false);
          },
          onmessage: (message) => {
            void handleLiveMessage(message);
          },
        },
        config: toSdkLiveConfig(liveToken.liveConfig),
        model: liveToken.model,
      });

      liveSessionRef.current = session;
      activeChatSessionIdRef.current = targetChatSessionId;
      setIsVoiceEnabled(true);

      try {
        setVoiceState("assistant-speaking");
        await speakOpenerWithBrowserVoice(liveToken.opener);
      } catch {
        // Keep voice active even if the browser opener speech fails.
      }

      enableListening();

      return true;
    } catch (error) {
      const message = getLiveErrorMessage(
        error,
        "Voice is unavailable right now. Continue with typed chat.",
      );

      await cleanupSession();
      setVoiceError(message);
      setVoiceState("fallback");
      onVoiceError(message);

      return false;
    } finally {
      connectingRef.current = false;
    }
  }

  async function disconnect() {
    await cleanupSession();
    setVoiceError(null);
    setVoiceState("idle");
  }

  async function sendTextTurn(
    text: string,
    pendingUserMessageId: string | null = null,
  ) {
    if (!liveSessionRef.current || !isVoiceEnabled) {
      throw new Error("Voice session is unavailable.");
    }

    if (pendingTextTurnRef.current) {
      throw new Error("Wait for the current reply before sending another message.");
    }

    disableListening();
    setVoiceState("assistant-speaking");

    await new Promise<void>((resolve, reject) => {
      pendingTextTurnRef.current = {
        pendingUserMessageId,
        reject,
        resolve,
      };
      liveSessionRef.current?.sendRealtimeInput({
        text,
      });
    });
  }

  useEffect(() => {
    return () => {
      void cleanupSessionRef.current();
    };
  }, []);

  useEffect(() => {
    if (!chatSessionId && liveSessionRef.current) {
      void cleanupSessionRef.current();
      setVoiceState("idle");
      setVoiceError(null);
    }
  }, [chatSessionId]);

  return {
    connect,
    disconnect,
    isVoiceEnabled,
    sendTextTurn,
    voiceError,
    voiceState,
  };
}

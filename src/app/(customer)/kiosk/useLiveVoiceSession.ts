"use client";

import {
  GoogleGenAI,
  type FunctionCall,
  type LiveConnectConfig,
  type LiveServerMessage,
  Modality,
  type Session as GeminiLiveSession,
  ThinkingLevel,
  Type,
} from "@google/genai";
import { useEffect, useRef, useState } from "react";

import type { GeminiLiveConfigPayload } from "@/types/api";

import type {
  KioskLeadCaptureState,
  KioskLiveToolCallResult,
  VoiceSessionState,
} from "./kioskTypes";
import {
  createPlaybackAudioBuffer,
  createRealtimeAudioChunk,
  type LiveAudioInlineData,
} from "./liveVoiceAudio";
import { createKioskLiveToken, sendKioskLiveToolCall } from "./kioskApi";

interface UseLiveVoiceSessionInput {
  chatSessionId: string | null;
  leadCaptureState: KioskLeadCaptureState;
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

const SPEECH_START_THRESHOLD = 0.018;
const SPEECH_CONTINUE_THRESHOLD = 0.012;
const SPEECH_END_SILENCE_MS = 1100;
const MIN_DETECTED_SPEECH_CHUNKS = 3;

function getLiveErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;
}

function getAudioLevel(samples: Float32Array) {
  let squaredSum = 0;

  for (let index = 0; index < samples.length; index += 1) {
    squaredSum += samples[index] * samples[index];
  }

  return Math.sqrt(squaredSum / samples.length);
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
  leadCaptureState,
  onResolvedTurn,
  onVoiceError,
}: UseLiveVoiceSessionInput) {
  const [voiceState, setVoiceState] = useState<VoiceSessionState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

  const isVoiceEnabledRef = useRef(false);
  const isAwaitingResponseRef = useRef(false);
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
  const bufferedAudioChunksRef = useRef<LiveRealtimeAudioInput[]>([]);
  const hasDetectedSpeechRef = useRef(false);
  const lastSpeechAtRef = useRef<number | null>(null);
  const detectedSpeechChunkCountRef = useRef(0);
  const autoSubmitInFlightRef = useRef(false);
  const cleanupSessionRef = useRef<() => Promise<void>>(async () => undefined);

  function resetPlaybackState() {
    playbackCursorRef.current = 0;
    queuedPlaybackCountRef.current = 0;
    pendingAssistantTurnCompleteRef.current = false;
  }

  function clearBufferedAudio() {
    bufferedAudioChunksRef.current = [];
  }

  function resetSpeechTracking() {
    hasDetectedSpeechRef.current = false;
    lastSpeechAtRef.current = null;
    detectedSpeechChunkCountRef.current = 0;
    autoSubmitInFlightRef.current = false;
  }

  function hasBufferedSpeech() {
    return (
      hasDetectedSpeechRef.current &&
      detectedSpeechChunkCountRef.current >= MIN_DETECTED_SPEECH_CHUNKS
    );
  }

  function setReadyState() {
    setVoiceState((currentVoiceState) =>
      currentVoiceState === "fallback" ? currentVoiceState : "ready",
    );
  }

  function stopRecording() {
    captureEnabledRef.current = false;
  }

  function updateVoiceEnabled(nextValue: boolean) {
    isVoiceEnabledRef.current = nextValue;
    setIsVoiceEnabled(nextValue);
  }

  function updateAwaitingResponse(nextValue: boolean) {
    isAwaitingResponseRef.current = nextValue;
    setIsAwaitingResponse(nextValue);
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
        setReadyState();
      }
    };

    sourceNode.start(scheduledStartTime);
  }

  async function degradeToFallback(message: string, notify = true) {
    await cleanupSession();
    setVoiceError(message);
    setVoiceState("fallback");

    if (notify) {
      onVoiceError(message);
    }
  }

  async function handleToolCalls(functionCalls: FunctionCall[]) {
    const activeChatSessionId = activeChatSessionIdRef.current ?? chatSessionId;

    if (!activeChatSessionId) {
      throw new Error("Chat session is unavailable for live voice.");
    }

    stopRecording();
    clearBufferedAudio();
    updateAwaitingResponse(true);
    setReadyState();

    const toolResponses = await Promise.all(
      functionCalls.map(async (functionCall) => {
        const customerTranscript =
          typeof functionCall.args?.customerTranscript === "string"
            ? functionCall.args.customerTranscript
            : "";

        const result = await sendKioskLiveToolCall(activeChatSessionId, {
          callId: functionCall.id ?? crypto.randomUUID(),
          customerTranscript,
          leadCaptureState,
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

    updateAwaitingResponse(false);
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

        rejectPendingTextTurn(new Error(liveErrorMessage));
        await degradeToFallback(liveErrorMessage);
      }

      return;
    }

    const serverContent = message.serverContent;

    if (!serverContent) {
      return;
    }

    if (serverContent.interrupted) {
      resetPlaybackState();
      updateAwaitingResponse(false);
      setReadyState();
      return;
    }

    const modelParts = serverContent.modelTurn?.parts ?? [];
    const audioParts = modelParts
      .map((part) => part.inlineData)
      .filter(isLiveAudioInlineData);

    if (audioParts.length > 0) {
      stopRecording();
      updateAwaitingResponse(false);
      setVoiceState("assistant-speaking");

      await Promise.all(audioParts.map((part) => queuePlaybackBlob(part)));
    }

    if (serverContent.turnComplete) {
      pendingAssistantTurnCompleteRef.current = true;

      if (queuedPlaybackCountRef.current === 0) {
        pendingAssistantTurnCompleteRef.current = false;
        updateAwaitingResponse(false);
        setReadyState();
      }
    }
  }

  async function cleanupSession() {
    shuttingDownRef.current = true;
    stopRecording();
    clearBufferedAudio();
    resetSpeechTracking();

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
    updateVoiceEnabled(false);
    updateAwaitingResponse(false);
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

      if (!captureEnabledRef.current) {
        return;
      }

      const inputBuffer = event.inputBuffer.getChannelData(0);

      if (!inputBuffer || inputBuffer.length === 0) {
        return;
      }

      const samples = new Float32Array(inputBuffer);
      const audioLevel = getAudioLevel(samples);
      const speechThreshold = hasDetectedSpeechRef.current
        ? SPEECH_CONTINUE_THRESHOLD
        : SPEECH_START_THRESHOLD;

      if (audioLevel >= speechThreshold) {
        hasDetectedSpeechRef.current = true;
        lastSpeechAtRef.current = performance.now();
        detectedSpeechChunkCountRef.current += 1;
      }

      if (
        hasBufferedSpeech() &&
        lastSpeechAtRef.current !== null &&
        !autoSubmitInFlightRef.current &&
        performance.now() - lastSpeechAtRef.current >= SPEECH_END_SILENCE_MS
      ) {
        autoSubmitInFlightRef.current = true;
        void submitBufferedAudio().catch((error) => {
          console.error("Failed to auto-submit buffered voice input.", error);
        });
        return;
      }

      const chunk = createRealtimeAudioChunk(
        samples,
        event.inputBuffer.sampleRate,
      );

      bufferedAudioChunksRef.current.push(chunk as LiveRealtimeAudioInput);
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
    updateAwaitingResponse(false);
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

            void degradeToFallback(
              "Voice is unavailable right now. Continue with typed chat.",
            );
          },
          onerror: () => {
            if (shuttingDownRef.current) {
              return;
            }

            void degradeToFallback(
              "Voice is unavailable right now. Continue with typed chat.",
            );
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
      updateVoiceEnabled(true);

      try {
        setVoiceState("assistant-speaking");
        await speakOpenerWithBrowserVoice(liveToken.opener);
      } catch {
        // Keep voice active even if the browser opener speech fails.
      }

      setReadyState();

      return true;
    } catch (error) {
      const message = getLiveErrorMessage(
        error,
        "Voice is unavailable right now. Continue with typed chat.",
      );

      await degradeToFallback(message);

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

  async function startRecording() {
    if (
      !liveSessionRef.current ||
      !isVoiceEnabledRef.current ||
      isAwaitingResponseRef.current ||
      pendingTextTurnRef.current
    ) {
      return false;
    }

    clearBufferedAudio();
    resetSpeechTracking();
    captureEnabledRef.current = true;
    setVoiceError(null);
    setVoiceState("recording");

    return true;
  }

  function cancelRecording() {
    stopRecording();
    clearBufferedAudio();
    resetSpeechTracking();

    if (isVoiceEnabled) {
      setReadyState();
    }
  }

  async function submitBufferedAudio() {
    if (!liveSessionRef.current || !isVoiceEnabledRef.current) {
      stopRecording();
      clearBufferedAudio();
      resetSpeechTracking();
      setReadyState();
      return false;
    }

    stopRecording();

    if (
      bufferedAudioChunksRef.current.length === 0 ||
      !hasBufferedSpeech()
    ) {
      clearBufferedAudio();
      resetSpeechTracking();
      setReadyState();
      return false;
    }

    const chunks = [...bufferedAudioChunksRef.current];
    clearBufferedAudio();
    resetSpeechTracking();
    updateAwaitingResponse(true);
    setReadyState();

    try {
      for (const chunk of chunks) {
        liveSessionRef.current.sendRealtimeInput({
          audio: chunk,
        });
      }

      liveSessionRef.current.sendRealtimeInput({
        audioStreamEnd: true,
      });

      return true;
    } catch (error) {
      const message = getLiveErrorMessage(
        error,
        "Voice is unavailable right now. Continue with typed chat.",
      );

      await degradeToFallback(message);
      throw new Error(message);
    }
  }

  async function submitRecording() {
    return submitBufferedAudio();
  }

  async function sendTextTurn(
    text: string,
    pendingUserMessageId: string | null = null,
  ) {
    if (!liveSessionRef.current || !isVoiceEnabled) {
      throw new Error("Voice session is unavailable.");
    }

    if (pendingTextTurnRef.current || isAwaitingResponseRef.current) {
      throw new Error("Wait for the current reply before sending another message.");
    }

    stopRecording();
    clearBufferedAudio();
    updateAwaitingResponse(true);
    setReadyState();

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
    cancelRecording,
    connect,
    disconnect,
    isAwaitingResponse,
    isRecording: voiceState === "recording",
    isVoiceEnabled,
    sendTextTurn,
    startRecording,
    submitRecording,
    voiceError,
    voiceState,
  };
}

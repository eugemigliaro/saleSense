"use client";

const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;
const INPUT_AUDIO_MIME_TYPE = "audio/pcm;rate=16000";

export interface LiveAudioInlineData {
  data?: string;
  mimeType?: string;
}

function clampSample(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function floatToPcm16(samples: Float32Array) {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = clampSample(samples[index]);
    const scaled =
      sample < 0 ? sample * 0x8000 : Math.min(sample * 0x7fff, 0x7fff);

    view.setInt16(index * 2, scaled, true);
  }

  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function downsampleTo16Khz(
  input: Float32Array,
  inputSampleRate: number,
): Float32Array {
  if (inputSampleRate === INPUT_SAMPLE_RATE) {
    return input;
  }

  const ratio = inputSampleRate / INPUT_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);
  let outputIndex = 0;
  let sourceIndex = 0;

  while (outputIndex < outputLength) {
    const nextSourceIndex = Math.min(
      input.length,
      Math.round((outputIndex + 1) * ratio),
    );
    let sum = 0;
    let count = 0;

    for (
      let currentIndex = sourceIndex;
      currentIndex < nextSourceIndex;
      currentIndex += 1
    ) {
      sum += input[currentIndex];
      count += 1;
    }

    output[outputIndex] = count > 0 ? sum / count : input[sourceIndex] ?? 0;
    outputIndex += 1;
    sourceIndex = nextSourceIndex;
  }

  return output;
}

export function createRealtimeAudioChunk(
  input: Float32Array,
  inputSampleRate: number,
) : LiveAudioInlineData {
  const downsampled = downsampleTo16Khz(input, inputSampleRate);
  const pcmBuffer = floatToPcm16(downsampled);

  return {
    data: arrayBufferToBase64(pcmBuffer),
    mimeType: INPUT_AUDIO_MIME_TYPE,
  };
}

export async function createPlaybackAudioBuffer(
  audioContext: AudioContext,
  audioBlob: LiveAudioInlineData,
) {
  if (!audioBlob.data) {
    throw new Error("Assistant audio chunk is missing base64 data.");
  }

  const buffer = base64ToArrayBuffer(audioBlob.data);
  const pcm = new Int16Array(buffer);
  const channelData = new Float32Array(pcm.length);

  for (let index = 0; index < pcm.length; index += 1) {
    channelData[index] = pcm[index] / 0x8000;
  }

  const audioBuffer = audioContext.createBuffer(
    1,
    channelData.length,
    OUTPUT_SAMPLE_RATE,
  );

  audioBuffer.copyToChannel(channelData, 0);

  return audioBuffer;
}

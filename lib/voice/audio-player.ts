"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Sarvam Bulbul returns audio as an array of base64-encoded MP3 chunks
// (long text gets split across synthesis windows). We decode each chunk
// into bytes, concatenate, blob-wrap as audio/mpeg, and play via the
// native HTMLAudioElement. This is simpler than the Web Audio API and
// works on every browser that runs the rest of the app.
//
// When Cartesia (streaming WebSocket TTS) lands, this hook will gain a
// playStream() that accepts an AsyncIterable of PCM/Opus chunks and uses
// AudioContext for gapless playback. Sarvam's batch shape doesn't need it.

interface PlayOptions {
  onEnded?: () => void;
  onError?: (message: string) => void;
}

interface UseAudioPlayerResult {
  isPlaying: boolean;
  /** Decode + play a Sarvam base64 MP3 array. Resolves when playback starts. */
  playBase64Mp3: (audios: string[], opts?: PlayOptions) => Promise<void>;
  /** Stop any in-flight playback immediately. */
  stop: () => void;
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsPlaying(false);
  }, [cleanup]);

  const playBase64Mp3 = useCallback(
    async (audios: string[], opts: PlayOptions = {}) => {
      // Tear down any prior playback before starting a new one.
      cleanup();

      if (audios.length === 0) {
        opts.onEnded?.();
        return;
      }

      let combined: Uint8Array;
      try {
        combined = concatBase64Chunks(audios);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not decode audio";
        opts.onError?.(message);
        return;
      }

      // Cast through BlobPart: lib.dom.d.ts since TS 5.7 narrows Uint8Array
      // to Uint8Array<ArrayBufferLike> which doesn't structurally match
      // Blob's BufferSource<ArrayBuffer> param. The underlying bytes are
      // identical — only the generic parameter is in dispute.
      const blob = new Blob([combined as BlobPart], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        cleanup();
        opts.onEnded?.();
      };

      audio.onerror = () => {
        const message =
          audio.error?.message ?? `Playback error code ${audio.error?.code}`;
        setIsPlaying(false);
        cleanup();
        opts.onError?.(message);
      };

      setIsPlaying(true);
      try {
        await audio.play();
      } catch (err) {
        setIsPlaying(false);
        cleanup();
        const message =
          err instanceof Error ? err.message : "audio.play() rejected";
        opts.onError?.(message);
      }
    },
    [cleanup]
  );

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { isPlaying, playBase64Mp3, stop };
}

function concatBase64Chunks(chunks: ReadonlyArray<string>): Uint8Array {
  const decoded = chunks.map((b64) => base64ToBytes(b64));
  const total = decoded.reduce((sum, b) => sum + b.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of decoded) {
    out.set(b, offset);
    offset += b.length;
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

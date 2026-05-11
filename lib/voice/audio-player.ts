"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Sarvam Bulbul returns audio as an array of base64-encoded WAV chunks for
// long text (each synthesized in its own ~30s window). Naively concatenating
// the bytes and playing the result fails: every chunk carries its own 44-byte
// RIFF header, so the browser sees the first header, plays through the first
// chunk's audio, hits the next chunk's RIFF header bytes (which look like
// garbage PCM), and stops. Stripping headers from chunks 2..N works for
// standard PCM WAVs but is brittle — the fmt chunk can extend past 44 bytes.
//
// Sequential playback is the robust fix: each chunk is its own short Audio
// element; we play them one after another in a queue. Listeners only see one
// "ended" callback when the last chunk finishes.
//
// When Cartesia (streaming WebSocket TTS) lands, this hook will gain a
// playStream() that accepts an AsyncIterable and uses AudioContext for true
// gapless playback. Sarvam's batch shape doesn't need it.

interface PlayOptions {
  onEnded?: () => void;
  onError?: (message: string) => void;
  /** MIME type for the per-chunk Blobs. Default 'audio/wav'. */
  contentType?: string;
}

interface UseAudioPlayerResult {
  isPlaying: boolean;
  /** Decode + play a base64 audio array. Returns when queue starts. */
  playBase64Audio: (audios: string[], opts?: PlayOptions) => Promise<void>;
  /** Stop any in-flight playback immediately. */
  stop: () => void;
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  // Cancellation token — incremented on every new play / stop. The play
  // loop checks this between chunks and bails if it's been bumped.
  const tokenRef = useRef(0);

  const teardownCurrent = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    teardownCurrent();
    setIsPlaying(false);
  }, [teardownCurrent]);

  const playBase64Audio = useCallback(
    async (audios: string[], opts: PlayOptions = {}) => {
      tokenRef.current += 1;
      const myToken = tokenRef.current;
      teardownCurrent();

      if (audios.length === 0) {
        opts.onEnded?.();
        return;
      }

      const contentType = opts.contentType ?? "audio/wav";
      let decoded: Uint8Array[];
      try {
        decoded = audios.map(base64ToBytes);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not decode audio";
        opts.onError?.(message);
        return;
      }

      setIsPlaying(true);

      // Sequential playback: each chunk plays as its own Audio element.
      for (let i = 0; i < decoded.length; i++) {
        if (myToken !== tokenRef.current) return; // cancelled
        try {
          await playOneChunk(
            decoded[i],
            contentType,
            currentAudioRef,
            currentUrlRef
          );
        } catch (err) {
          if (myToken !== tokenRef.current) return;
          const message =
            err instanceof Error ? err.message : "Audio playback failed";
          setIsPlaying(false);
          teardownCurrent();
          opts.onError?.(message);
          return;
        }
      }

      if (myToken !== tokenRef.current) return;
      setIsPlaying(false);
      teardownCurrent();
      opts.onEnded?.();
    },
    [teardownCurrent]
  );

  useEffect(() => {
    return () => {
      tokenRef.current += 1;
      teardownCurrent();
    };
  }, [teardownCurrent]);

  return { isPlaying, playBase64Audio, stop };
}

function playOneChunk(
  bytes: Uint8Array,
  contentType: string,
  currentAudioRef: React.MutableRefObject<HTMLAudioElement | null>,
  currentUrlRef: React.MutableRefObject<string | null>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes as BlobPart], { type: contentType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    currentAudioRef.current = audio;
    currentUrlRef.current = url;

    audio.onended = () => {
      // ended handler intentionally only resolves; teardown of url + element
      // happens in the next chunk's setup (or in teardownCurrent on stop).
      resolve();
    };
    audio.onerror = () => {
      const message =
        audio.error?.message ?? `Playback error code ${audio.error?.code}`;
      reject(new Error(message));
    };

    audio.play().catch((err) => {
      reject(err instanceof Error ? err : new Error("audio.play() rejected"));
    });
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Push-to-talk mic capture via getUserMedia + MediaRecorder. Records to
// WebM/Opus by default (the broadly-supported browser format). Sarvam STT
// accepts WebM directly — no transcoding needed.
//
// Auto-stops at maxDurationMs (default 30s) to match Sarvam's REST endpoint
// sync-mode limit and to keep candidates from accidentally recording the
// entire session in one blob.

interface UseMicCaptureOptions {
  /** Fires when recording stops with a non-empty audio blob. */
  onBlob?: (blob: Blob, durationMs: number) => void;
  /** Fires for permission denials or recorder errors. */
  onError?: (kind: MicErrorKind, message: string) => void;
  /** Auto-stop after this many ms. Default 30000. */
  maxDurationMs?: number;
}

export type MicErrorKind = "permission-denied" | "no-device" | "recorder-error";

interface UseMicCaptureResult {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => void;
  error: string | null;
}

export function useMicCapture(
  opts: UseMicCaptureOptions = {}
): UseMicCaptureResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBlobRef = useRef(opts.onBlob);
  const onErrorRef = useRef(opts.onError);
  useEffect(() => {
    onBlobRef.current = opts.onBlob;
    onErrorRef.current = opts.onError;
  }, [opts.onBlob, opts.onError]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state === "recording") {
      r.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (isRecording) return;
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const kind: MicErrorKind =
        name === "NotAllowedError" || name === "SecurityError"
          ? "permission-denied"
          : name === "NotFoundError"
            ? "no-device"
            : "recorder-error";
      const message =
        err instanceof Error ? err.message : "Could not access microphone";
      setError(message);
      onErrorRef.current?.(kind, message);
      return;
    }

    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : ""; // Let MediaRecorder pick if neither is supported (rare).

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (err) {
      cleanup();
      const message =
        err instanceof Error ? err.message : "Could not create recorder";
      setError(message);
      onErrorRef.current?.("recorder-error", message);
      return;
    }

    chunksRef.current = [];
    startedAtRef.current = Date.now();
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onerror = (e) => {
      const message =
        (e as unknown as { error?: { message?: string } })?.error?.message ??
        "Recorder error";
      setError(message);
      onErrorRef.current?.("recorder-error", message);
      cleanup();
      setIsRecording(false);
    };

    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current;
      const blob = new Blob(chunksRef.current, {
        type: mimeType || "audio/webm",
      });
      chunksRef.current = [];
      cleanup();
      setIsRecording(false);
      if (blob.size > 0) onBlobRef.current?.(blob, durationMs);
    };

    recorder.start();
    setIsRecording(true);

    const maxMs = opts.maxDurationMs ?? 30_000;
    timeoutRef.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, maxMs);
  }, [cleanup, isRecording, opts.maxDurationMs]);

  // Cleanup on unmount — release mic + drop pending callbacks.
  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      cleanup();
    };
  }, [cleanup]);

  return { isRecording, start, stop, error };
}

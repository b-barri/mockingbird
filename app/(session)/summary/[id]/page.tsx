"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SummaryCard } from "@/components/summary/summary-card";
import { getKey } from "@/lib/auth/key-storage";
import { getCaseById } from "@/lib/llm/prompts/case-templates";
import {
  formatTotalCost,
} from "@/lib/telemetry/cost-tracker";
import {
  formatDuration,
  loadCompletedSession,
} from "@/lib/voice/session-store";

// R16 + R16a: post-session summary route. Reads the completed session from
// sessionStorage (saved by the session page on End), POSTs transcript to
// /api/summary, streams the generated paragraph into the card.

export default function SummaryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  const [summaryText, setSummaryText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [caseTitle, setCaseTitle] = useState("");
  const [duration, setDuration] = useState("00:00");
  const [spend, setSpend] = useState("$0.000");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const session = loadCompletedSession(id);
      if (!session) {
        setError(`No session found with id ${id}.`);
        setCaseTitle("Session not found");
        setLoading(false);
        return;
      }

      const caseTemplate = getCaseById(session.caseId);
      setCaseTitle(caseTemplate?.title ?? "Product Design case");
      setDuration(formatDuration(session.endedAt - session.startedAt));
      setSpend(formatTotalCost());

      const llmKey = getKey("llm");
      if (!llmKey) {
        setError("LLM key not found in browser storage.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-llm-key": llmKey,
          },
          body: JSON.stringify({
            caseId: session.caseId,
            turns: session.turns,
          }),
        });
        if (!response.ok || !response.body) {
          setError(`Summary service returned ${response.status}.`);
          setLoading(false);
          return;
        }
        await streamSummary(response.body, (chunk) => {
          if (cancelled) return;
          setSummaryText((prev) => prev + chunk);
        });
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not reach the summary service."
        );
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-cream px-8 py-section">
      <SummaryCard
        sessionId={id}
        caseTitle={caseTitle}
        duration={duration}
        spend={spend}
        loading={loading}
        error={error}
        summaryText={summaryText || undefined}
        onViewTranscript={() => router.push(`/session?case=${id}&review=1`)}
      />
    </main>
  );
}

/** Parse a text/event-stream body and call onChunk(text) for each data event. */
async function streamSummary(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.replace(/^data:\s*/, "").trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as { text?: string; error?: string };
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.text) onChunk(parsed.text);
      } catch {
        // Tolerate partial JSON in fragmented chunks.
      }
    }
  }
}

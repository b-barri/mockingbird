"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SummaryCard } from "@/components/summary/summary-card";
import { getKey } from "@/lib/auth/key-storage";
import { getCaseById } from "@/lib/llm/prompts/case-templates";
import type { StructuredFeedback } from "@/lib/llm/summary";
import {
  formatTotalCost,
} from "@/lib/telemetry/cost-tracker";
import {
  formatDuration,
  loadCompletedSession,
} from "@/lib/voice/session-store";

// Post-session summary route. It reads the completed session from
// sessionStorage (saved by the session page when you end the call), posts the
// transcript to /api/summary, waits for the buffered structured JSON response,
// and hands it to the card.

export default function SummaryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  const [feedback, setFeedback] = useState<StructuredFeedback | undefined>();
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
        setError(`No saved session found for id ${id}.`);
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
        setError("No LLM key found in your browser. Add it again to generate the summary.");
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
        if (cancelled) return;
        const data = (await response.json()) as
          | StructuredFeedback
          | { error: string };
        if (!response.ok || "error" in data) {
          const message =
            "error" in data ? data.error : `The summary service returned ${response.status}.`;
          setError(message);
          setLoading(false);
          return;
        }
        setFeedback(data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not reach the summary service. Check your connection and run it again."
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
    <main className="px-4 py-section sm:px-6 lg:px-8">
      <SummaryCard
        sessionId={id}
        caseTitle={caseTitle}
        duration={duration}
        spend={spend}
        loading={loading}
        error={error}
        feedback={feedback}
        onViewTranscript={() => router.push(`/session?case=${id}&review=1`)}
      />
    </main>
  );
}

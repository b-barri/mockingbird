"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CostEstimate } from "@/components/onboarding/cost-estimate";
import { KeyInput } from "@/components/onboarding/key-input";
import { checkFormat } from "@/lib/auth/key-validation";
import { setKey } from "@/lib/auth/key-storage";

type LlmChoice = "anthropic" | "openai";
type VoiceChoice = "cartesia" | "sarvam" | "elevenlabs";

// F1 step 3 → step 4: key entry, format validation, synchronous ping per
// provider via /api/validate-key (R6a), then navigate to /onboarding/case-select.

export default function OnboardingPage() {
  const router = useRouter();
  const [llm, setLlm] = useState<LlmChoice>("anthropic");
  const [voice, setVoice] = useState<VoiceChoice>("cartesia");
  const [llmKey, setLlmKey] = useState("");
  const [voiceKey, setVoiceKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [validating, setValidating] = useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setValidating(true);

    // Pre-flight format check
    const llmFormat = checkFormat(llm, llmKey);
    const voiceFormat = checkFormat(voice, voiceKey);
    if (!llmFormat.ok || !voiceFormat.ok) {
      setErrors({
        [llm]: !llmFormat.ok ? llmFormat.reason : undefined,
        [voice]: !voiceFormat.ok ? voiceFormat.reason : undefined,
      });
      setValidating(false);
      return;
    }

    // Synchronous ping validation per R6a
    const [llmResp, voiceResp] = await Promise.all([
      pingValidate(llm, llmKey),
      pingValidate(voice, voiceKey),
    ]);
    if (!llmResp.ok || !voiceResp.ok) {
      setErrors({
        [llm]: !llmResp.ok ? llmResp.error : undefined,
        [voice]: !voiceResp.ok ? voiceResp.error : undefined,
      });
      setValidating(false);
      return;
    }

    // Persist + navigate
    setKey("llm", llmKey, { remember });
    setKey(voice, voiceKey, { remember });
    router.push(`/onboarding/case-select?llm=${llm}&voice=${voice}`);
  }

  return (
    <main className="mx-auto max-w-xl px-8 py-section">
      <header className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-coral">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" /> Onboarding · step 1 of 2
        </div>
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Bring your API keys.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          Mockingbird never holds your keys. They live in your browser. Pick
          a model + a voice, paste both keys, and we'll verify them before
          starting your case.
        </p>
      </header>

      <form onSubmit={handleStart} className="grid gap-7">
        {/* LLM choice */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">
            Choose an interviewer model
          </legend>
          <div className="mb-3 flex gap-2">
            {(["anthropic", "openai"] as LlmChoice[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setLlm(p)}
                data-active={llm === p}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium data-[active=false]:border-ink/[0.12] data-[active=true]:border-ink data-[active=true]:bg-ink data-[active=true]:text-cream"
              >
                {p === "anthropic" ? "Anthropic Claude" : "OpenAI GPT"}
              </button>
            ))}
          </div>
          <KeyInput
            provider={llm}
            label={`${llm === "anthropic" ? "Anthropic" : "OpenAI"} API key`}
            description="Used to power the interviewer's voice and reasoning."
            value={llmKey}
            onChange={setLlmKey}
            inlineError={errors[llm]}
          />
        </fieldset>

        {/* Voice choice */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">
            Choose a voice provider
          </legend>
          <div className="mb-3 flex gap-2">
            {(["cartesia", "sarvam", "elevenlabs"] as VoiceChoice[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setVoice(p)}
                data-active={voice === p}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium data-[active=false]:border-ink/[0.12] data-[active=true]:border-ink data-[active=true]:bg-ink data-[active=true]:text-cream"
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <KeyInput
            provider={voice}
            label={`${voice.charAt(0).toUpperCase() + voice.slice(1)} API key`}
            description="Synthesizes the interviewer's voice."
            value={voiceKey}
            onChange={setVoiceKey}
            inlineError={errors[voice]}
          />
        </fieldset>

        <CostEstimate llmProvider={llm} voiceProvider={voice} />

        <label className="flex items-start gap-2.5 text-xs text-mute">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Remember keys on this device. Stored in localStorage protected by
            the CSP header set in <code className="font-mono text-[11px]">next.config.ts</code>. Uncheck to keep keys in session storage only.
          </span>
        </label>

        <button
          type="submit"
          disabled={validating || !llmKey || !voiceKey}
          className="rounded-lg bg-ink py-3 text-sm font-semibold text-cream transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {validating ? "Validating…" : "Continue to case selection →"}
        </button>
      </form>
    </main>
  );
}

interface PingResponse {
  ok: boolean;
  error?: string;
}

async function pingValidate(
  provider: string,
  key: string
): Promise<PingResponse> {
  try {
    const response = await fetch("/api/validate-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, key }),
    });
    const data = (await response.json()) as PingResponse;
    return data;
  } catch (err) {
    return {
      ok: false,
      error: `Could not reach the validation service: ${
        err instanceof Error ? err.message : "unknown error"
      }`,
    };
  }
}

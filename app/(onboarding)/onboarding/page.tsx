"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CostEstimate } from "@/components/onboarding/cost-estimate";
import { KeyInput } from "@/components/onboarding/key-input";
import { AppContainer } from "@/components/shell/app-container";
import { checkFormat } from "@/lib/auth/key-validation";
import { setKey } from "@/lib/auth/key-storage";

type LlmChoice = "anthropic" | "openai";
type VoiceChoice = "cartesia" | "sarvam";

// F1 step 3 → step 4: key entry, format validation, synchronous ping per
// provider via /api/validate-key (R6a), then navigate to /onboarding/case-select.
// Linear direction: dark panels with quiet section labels, sentence-case copy,
// status dots, and the Ember keys banner above the form.

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

    // V1 preview state: voice adapters in U2 are stubs, so the voice key is
    // optional during the scaffold phase. The LLM key is required because
    // /api/interview is a real Anthropic streaming proxy.
    const voiceKeyProvided = voiceKey.trim().length > 0;

    const llmFormat = checkFormat(llm, llmKey);
    const voiceFormat = voiceKeyProvided ? checkFormat(voice, voiceKey) : { ok: true };
    if (!llmFormat.ok || !voiceFormat.ok) {
      setErrors({
        [llm]: !llmFormat.ok ? llmFormat.reason : undefined,
        [voice]: !voiceFormat.ok ? voiceFormat.reason : undefined,
      });
      setValidating(false);
      return;
    }

    const [llmResp, voiceResp] = await Promise.all([
      pingValidate(llm, llmKey),
      voiceKeyProvided
        ? pingValidate(voice, voiceKey)
        : Promise.resolve({ ok: true } as PingResponse),
    ]);
    if (!llmResp.ok || !voiceResp.ok) {
      setErrors({
        [llm]: !llmResp.ok ? llmResp.error : undefined,
        [voice]: !voiceResp.ok ? voiceResp.error : undefined,
      });
      setValidating(false);
      return;
    }

    setKey("llm", llmKey, { remember });
    if (voiceKeyProvided) setKey(voice, voiceKey, { remember });
    router.push(`/onboarding/case-select?llm=${llm}&voice=${voice}`);
  }

  const llmReady = llmKey.trim().length > 0;
  const voiceReady = voiceKey.trim().length > 0;

  return (
    <AppContainer>
      <div className="ascii-rule mb-4 text-coral">
        Step 1 of 2 · Bring your own keys
      </div>

      <h1 className="mb-3 font-sans text-4xl font-semibold leading-[1.05] tracking-[-0.022em] text-ink sm:text-5xl">
        Bring your keys.
        <br />
        We&apos;ll bring the interviewer.
      </h1>

      <p className="mb-8 max-w-[520px] text-[14px] leading-relaxed text-ink-2 sm:mb-10">
        Your keys stay in your browser. We check that they work before any
        tokens get spent.
      </p>

      {/* Prominent banner: Ember holding the keys. Mirrors the case-select
          page's choose-option banner so the two onboarding steps parallel. */}
      <div className="brand-image-glow mb-10 sm:mb-12">
        <Image
          src="/branding/ember_keys.png"
          alt="Ember holding the keys, ready for the candidate"
          width={1672}
          height={941}
          priority
          className="w-full rounded-xl ring-1 ring-white/[0.08]"
        />
      </div>

      <form onSubmit={handleStart} className="space-y-5">
        {/* LLM panel */}
        <fieldset className="pf-panel p-4 sm:p-6">
          <legend className="sr-only">Pick the interviewer&apos;s language model</legend>
          <div className="ascii-rule mb-4">Language model</div>

          <div className="mb-4 flex gap-2">
            {(["anthropic", "openai"] as LlmChoice[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setLlm(p)}
                data-active={llm === p}
                className="inline-flex items-center gap-2 rounded-[8px] border px-3 py-[7px] text-[12px] capitalize transition-colors duration-quick data-[active=false]:border-white/15 data-[active=false]:bg-white/[0.03] data-[active=false]:text-ink-2 data-[active=true]:border-coral/60 data-[active=true]:bg-coral/15 data-[active=true]:text-ink"
              >
                <span
                  className={`inline-block h-[6px] w-[6px] rounded-full ${
                    llm === p ? "bg-coral" : "bg-ink/30"
                  }`}
                />
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <KeyInput
                provider={llm}
                label={`${llm === "anthropic" ? "Anthropic" : "OpenAI"} API key`}
                description="Runs the interviewer. Spend lands on your account, not ours."
                value={llmKey}
                onChange={setLlmKey}
                inlineError={errors[llm]}
              />
            </div>
          </div>
          <KeyStatus ready={llmReady} className="mt-2" />
        </fieldset>

        {/* Voice panel */}
        <fieldset className="pf-panel p-4 sm:p-6">
          <legend className="sr-only">Pick a voice for the interviewer</legend>
          <div className="ascii-rule mb-4">Voice (optional)</div>

          <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
            Voice adapters are stubs in V1. Skip this to run text-only. The
            interviewer gets a real voice after the V0 bakeoff.
          </p>

          <div className="mb-4 flex gap-2">
            {(["cartesia", "sarvam"] as VoiceChoice[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setVoice(p)}
                data-active={voice === p}
                className="inline-flex items-center gap-2 rounded-[8px] border px-3 py-[7px] text-[12px] capitalize transition-colors duration-quick data-[active=false]:border-white/15 data-[active=false]:bg-white/[0.03] data-[active=false]:text-ink-2 data-[active=true]:border-coral/60 data-[active=true]:bg-coral/15 data-[active=true]:text-ink"
              >
                <span
                  className={`inline-block h-[6px] w-[6px] rounded-full ${
                    voice === p ? "bg-coral" : "bg-ink/30"
                  }`}
                />
                {p}
              </button>
            ))}
          </div>

          <KeyInput
            provider={voice}
            label={`${voice.charAt(0).toUpperCase() + voice.slice(1)} API key`}
            description="Gives the interviewer a voice. Skip to run text-only."
            value={voiceKey}
            onChange={setVoiceKey}
            inlineError={errors[voice]}
          />
          <KeyStatus
            ready={voiceReady}
            pendingLabel="Optional"
            className="mt-2"
          />
        </fieldset>

        {/* Budget panel: cost estimate + remember toggle */}
        <div className="pf-panel space-y-4 p-4 sm:p-6">
          <div className="ascii-rule">Budget</div>
          <CostEstimate llmProvider={llm} voiceProvider={voice} />
          <label className="flex items-start gap-2.5 border-t border-white/[0.08] pt-3 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 accent-coral"
            />
            <span>
              Remember my keys{" "}
              <span className="text-mute">
                on this device. Uncheck on a shared laptop.
              </span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={validating || !llmKey}
          className="pf-exec-btn w-full justify-start disabled:cursor-not-allowed disabled:opacity-40"
        >
          {validating ? "Checking your keys…" : "Continue to case select"}
          {!validating && <span className="kbd ml-auto">⌘ ↵</span>}
        </button>
      </form>
    </AppContainer>
  );
}

// Status dot for a key field: a pulsing coral "Ready" when set, a quiet label
// when empty.
function KeyStatus({
  ready,
  pendingLabel = "Pending",
  className = "",
}: {
  ready: boolean;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-[12px] ${className}`}
      data-testid={ready ? "key-status-ready" : "key-status-pending"}
    >
      {ready ? (
        <>
          <span className="pulse-dot" />
          <span className="text-coral">Ready</span>
        </>
      ) : (
        <span className="text-mute">{pendingLabel}</span>
      )}
    </div>
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

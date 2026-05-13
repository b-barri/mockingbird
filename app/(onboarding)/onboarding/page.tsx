"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CostEstimate } from "@/components/onboarding/cost-estimate";
import { KeyInput } from "@/components/onboarding/key-input";
import { checkFormat } from "@/lib/auth/key-validation";
import { setKey } from "@/lib/auth/key-storage";

type LlmChoice = "anthropic" | "openai";
type VoiceChoice = "cartesia" | "sarvam";

// F1 step 3 → step 4: key entry, format validation, synchronous ping per
// provider via /api/validate-key (R6a), then navigate to /onboarding/case-select.
// Pre-flight Console direction: tan panels with ASCII section dividers, mono
// labels + status dots, ember_keys banner above the form.

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
    <main className="mx-auto max-w-3xl px-4 pt-10 pb-section sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
      <div className="mb-4 font-mono text-[11px] tracking-wide text-coral">
        [STEP 1/2]&nbsp;&nbsp;ONBOARDING · BYO_KEYS
      </div>

      <h1 className="mb-3 font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl">
        Bring your keys.
        <br />
        We&apos;ll bring the interviewer.
      </h1>

      <p className="mb-8 max-w-[520px] font-mono text-[13px] leading-relaxed text-mute sm:mb-10 sm:text-[14px]">
        // keys live in your browser. validated synchronously before any
        tokens get spent.
      </p>

      {/* Prominent banner: Ember holding the keys. Mirrors the case-select
          page's choose_option banner so the two onboarding steps parallel. */}
      <div className="brand-image-glow mb-10 sm:mb-12">
        <Image
          src="/branding/ember_keys.png"
          alt="Ember holding the keys, ready for the candidate"
          width={1672}
          height={941}
          priority
          className="w-full rounded-2xl shadow-[0_24px_50px_-22px_rgba(26,22,18,0.40)] ring-1 ring-ink/[0.08]"
        />
      </div>

      <form onSubmit={handleStart} className="space-y-5">
        {/* LLM panel */}
        <fieldset className="pf-panel p-4 sm:p-6">
          <legend className="sr-only">Pick your interviewer&apos;s brain</legend>
          <div className="ascii-rule mb-4">
            ── LLM ──────────────────────────────────────────
          </div>

          <div className="mb-4 flex gap-2">
            {(["anthropic", "openai"] as LlmChoice[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setLlm(p)}
                data-active={llm === p}
                className="inline-flex items-center gap-2 rounded-[3px] border px-3 py-[7px] font-mono text-[12px] data-[active=false]:border-ink/20 data-[active=false]:bg-cream data-[active=false]:text-ink data-[active=true]:border-ink data-[active=true]:bg-ink data-[active=true]:text-cream"
              >
                <span
                  className="inline-block h-[6px] w-[6px] rounded-full"
                  style={{
                    backgroundColor:
                      llm === p ? "#E85D3B" : "rgba(26,22,18,0.30)",
                  }}
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
                description="Powers the interviewer's brain. Spend lands on your account, not ours."
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
          <legend className="sr-only">Pick a voice for Alex</legend>
          <div className="ascii-rule mb-4">
            ── VOICE ──────────────────────────── [OPTIONAL]
          </div>

          <p className="mb-3 font-mono text-[11px] text-mute">
            // voice adapters are stubs in V1. skip to run text-only — alex
            grows actual vocal cords after the V0 bakeoff.
          </p>

          <div className="mb-4 flex gap-2">
            {(["cartesia", "sarvam"] as VoiceChoice[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setVoice(p)}
                data-active={voice === p}
                className="inline-flex items-center gap-2 rounded-[3px] border px-3 py-[7px] font-mono text-[12px] data-[active=false]:border-ink/20 data-[active=false]:bg-cream data-[active=false]:text-ink data-[active=true]:border-ink data-[active=true]:bg-ink data-[active=true]:text-cream"
              >
                <span
                  className="inline-block h-[6px] w-[6px] rounded-full"
                  style={{
                    backgroundColor:
                      voice === p ? "#E85D3B" : "rgba(26,22,18,0.30)",
                  }}
                />
                {p}
              </button>
            ))}
          </div>

          <KeyInput
            provider={voice}
            label={`${voice.charAt(0).toUpperCase() + voice.slice(1)} API key`}
            description="Gives Alex a mouth. Skip to run text-only — Alex won't be offended."
            value={voiceKey}
            onChange={setVoiceKey}
            inlineError={errors[voice]}
          />
          <KeyStatus
            ready={voiceReady}
            pendingLabel="○ OPTIONAL"
            className="mt-2"
          />
        </fieldset>

        {/* Budget panel: cost estimate + remember toggle */}
        <div className="pf-panel space-y-4 p-4 sm:p-6">
          <div className="ascii-rule">
            ── BUDGET ───────────────────────────────────────
          </div>
          <CostEstimate llmProvider={llm} voiceProvider={voice} />
          <label className="flex items-start gap-2.5 border-t border-ink/10 pt-3 font-mono text-[11px] text-ink">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              [&nbsp;]&nbsp;PERSIST_KEYS&nbsp;&nbsp;
              <span className="text-mute">
                // remember on this device. Uncheck on a shared laptop.
              </span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={validating || !llmKey}
          className="w-full rounded-[3px] bg-ink px-5 py-3.5 text-left font-mono text-[13px] font-medium text-cream transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="mr-2 text-coral">▸</span>
          {validating
            ? "Pinging your provider…"
            : "Continue → /onboarding/case-select"}
          {!validating && (
            <span className="animate-caret-blink text-cream/85" aria-hidden>
              _
            </span>
          )}
        </button>
      </form>
    </main>
  );
}

// Mono status dot for a key field — pulsing coral READY when set, dim PENDING when empty.
function KeyStatus({
  ready,
  pendingLabel = "○ PENDING",
  className = "",
}: {
  ready: boolean;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 font-mono text-[11px] ${className}`}
      data-testid={ready ? "key-status-ready" : "key-status-pending"}
    >
      {ready ? (
        <>
          <span className="pulse-dot" />
          <span className="text-coral">READY</span>
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

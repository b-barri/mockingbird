// Client-side format checks for BYO API keys, plus error copy that maps
// from generic failure to the provider-specific actionable message R6a
// requires ("Invalid Anthropic key — check at console.anthropic.com").
// Server-side ping validation lives in app/api/validate-key/route.ts.

export type LlmProvider = "anthropic" | "openai";

export interface FormatResult {
  ok: boolean;
  reason?: string;
}

const FORMAT_RULES: Record<string, RegExp> = {
  anthropic: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
  openai: /^sk-[A-Za-z0-9_-]{20,}$/,
  cartesia: /^[A-Za-z0-9_-]{16,}$/,
  sarvam: /^[A-Za-z0-9_-]{12,}$/,
  elevenlabs: /^sk_[A-Za-z0-9_-]{24,}$/,
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  cartesia: "Cartesia",
  sarvam: "Sarvam",
  elevenlabs: "ElevenLabs",
};

const PROVIDER_CONSOLE_URL: Record<string, string> = {
  anthropic: "console.anthropic.com",
  openai: "platform.openai.com/api-keys",
  cartesia: "play.cartesia.ai",
  sarvam: "dashboard.sarvam.ai",
  elevenlabs: "elevenlabs.io/app/settings/api-keys",
};

/** Validate an API key's format. Returns ok=true if it passes the regex. */
export function checkFormat(provider: string, value: string): FormatResult {
  if (!value || value.trim().length === 0) {
    return { ok: false, reason: "Key is empty." };
  }
  const rule = FORMAT_RULES[provider];
  if (!rule) {
    // Unknown providers are accepted on format (only fail on server ping).
    return { ok: true };
  }
  if (!rule.test(value.trim())) {
    return {
      ok: false,
      reason: `${PROVIDER_LABELS[provider]} key format looks wrong — check at ${PROVIDER_CONSOLE_URL[provider]}.`,
    };
  }
  return { ok: true };
}

/** Human-readable provider name. */
export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

/** Console URL where the user can verify or regenerate their key. */
export function providerConsoleUrl(provider: string): string | undefined {
  return PROVIDER_CONSOLE_URL[provider];
}

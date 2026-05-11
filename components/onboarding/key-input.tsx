"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { checkFormat, providerConsoleUrl } from "@/lib/auth/key-validation";

interface KeyInputProps {
  provider: string;
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  /** Inline format error shown to the user. */
  inlineError?: string;
}

export function KeyInput({
  provider,
  label,
  description,
  value,
  onChange,
  inlineError,
}: KeyInputProps) {
  const [focused, setFocused] = useState(false);
  const formatCheck = value ? checkFormat(provider, value) : { ok: true };
  const error = inlineError ?? (!focused && value && !formatCheck.ok ? formatCheck.reason : undefined);

  const consoleUrl = providerConsoleUrl(provider);

  return (
    <label className="block" data-testid={`key-input-${provider}`}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {consoleUrl && (
          <a
            href={`https://${consoleUrl}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-mute hover:text-ink"
          >
            Get a key ↗
          </a>
        )}
      </div>
      {description && (
        <p className="mb-2 text-xs leading-relaxed text-mute">{description}</p>
      )}
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        data-error={error ? "true" : "false"}
        placeholder={placeholderFor(provider)}
        className={clsx(
          "w-full rounded-lg border bg-white px-4 py-2.5 font-mono text-sm text-ink placeholder:text-mute/50 focus:outline-none",
          error
            ? "border-red-500/40 focus:border-red-500/70"
            : "border-ink/[0.12] focus:border-ink/30"
        )}
      />
      {error && (
        <p
          role="alert"
          className="mt-1.5 text-xs text-red-700"
          data-testid={`key-input-error-${provider}`}
        >
          {error}
        </p>
      )}
    </label>
  );
}

function placeholderFor(provider: string): string {
  switch (provider) {
    case "anthropic":
      return "sk-ant-...";
    case "openai":
      return "sk-...";
    case "elevenlabs":
      return "sk_...";
    default:
      return "your API key";
  }
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getKey, setKey, hasKey } from "@/lib/auth/key-storage";
import { saveBrief } from "@/lib/screen/brief-store";
import type { Brief } from "@/lib/screen/brief";

// U1: screening-prep input form. Collects company, URL, role, JD; validates;
// calls /api/research with the BYO LLM key; stores the returned brief
// client-side; navigates to the brief view. Mirrors the onboarding page's
// console aesthetic (.pf-panel, .ascii-rule, mono labels, coral accents).

export interface PrepInputs {
  company: string;
  companyUrl: string;
  role: string;
  jobDescription: string;
}

export type PrepErrors = Partial<Record<keyof PrepInputs, string>>;

/** Pure validation — exported for unit tests. */
export function validatePrepInputs(input: PrepInputs): {
  ok: boolean;
  errors: PrepErrors;
} {
  const errors: PrepErrors = {};
  if (!input.company.trim()) errors.company = "Company is required.";
  if (!input.role.trim()) errors.role = "Role is required.";
  if (input.jobDescription.trim().length < 20)
    errors.jobDescription = "Paste the job description (at least a couple of lines).";
  const url = input.companyUrl.trim();
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:")
        errors.companyUrl = "URL must start with http:// or https://";
    } catch {
      errors.companyUrl = "That doesn't look like a valid URL.";
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function PrepForm() {
  const router = useRouter();
  const [inputs, setInputs] = useState<PrepInputs>({
    company: "",
    companyUrl: "",
    role: "",
    jobDescription: "",
  });
  const [errors, setErrors] = useState<PrepErrors>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Inline key capture so /screen is self-contained (no onboarding detour).
  const [keyPresent, setKeyPresent] = useState(true);
  const [inlineKey, setInlineKey] = useState("");

  useEffect(() => {
    setKeyPresent(hasKey("llm"));
  }, []);

  function set<K extends keyof PrepInputs>(key: K, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(null);
    const { ok, errors: errs } = validatePrepInputs(inputs);
    setErrors(errs);
    if (!ok) return;

    // Use a stored key if present, otherwise the one entered inline here.
    const apiKey = getKey("llm") || inlineKey.trim();
    if (!apiKey) {
      setSubmitErr("Enter your Anthropic API key above to run the research.");
      return;
    }
    // Persist the inline key for this tab so re-runs don't re-prompt.
    if (!getKey("llm")) setKey("llm", apiKey);

    setBusy(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json", "x-llm-key": apiKey },
        body: JSON.stringify({
          company: inputs.company.trim(),
          role: inputs.role.trim(),
          jobDescription: inputs.jobDescription.trim(),
          companyUrl: inputs.companyUrl.trim() || undefined,
        }),
      });
      const data = (await res.json()) as Brief | { error: string };
      if (!res.ok || "error" in data) {
        setSubmitErr(
          "error" in data ? data.error : `Research failed (${res.status}).`
        );
        return;
      }
      saveBrief(data);
      router.push(`/screen/brief/${data.id}`);
    } catch (err) {
      setSubmitErr(
        `Could not reach the research service: ${
          err instanceof Error ? err.message : "unknown error"
        }`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!keyPresent && (
        <fieldset className="pf-panel space-y-3 p-4 sm:p-6">
          <legend className="sr-only">Anthropic API key</legend>
          <div className="ascii-rule mb-1">── ANTHROPIC_KEY ─────────────────────────────────</div>
          <p className="font-mono text-[11px] text-mute">
            // research runs on your key (pass-through, never stored server-side).
            stays in this browser.
          </p>
          <input
            id="anthropic-key"
            type="password"
            value={inlineKey}
            placeholder="sk-ant-…"
            onChange={(e) => setInlineKey(e.target.value)}
            className="w-full rounded-[3px] border border-ink/20 bg-cream px-3 py-2 font-mono text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
          />
        </fieldset>
      )}

      <fieldset className="pf-panel space-y-4 p-4 sm:p-6">
        <legend className="sr-only">Where are you interviewing?</legend>
        <div className="ascii-rule mb-1">── TARGET ───────────────────────────────────────</div>

        <Field
          id="company"
          label="Company"
          placeholder="Fireflies.ai"
          value={inputs.company}
          onChange={(v) => set("company", v)}
          error={errors.company}
        />
        <Field
          id="role"
          label="Role"
          placeholder="Product Manager"
          value={inputs.role}
          onChange={(v) => set("role", v)}
          error={errors.role}
        />
        <Field
          id="companyUrl"
          label="Company URL"
          optional
          placeholder="https://fireflies.ai"
          value={inputs.companyUrl}
          onChange={(v) => set("companyUrl", v)}
          error={errors.companyUrl}
        />
      </fieldset>

      <fieldset className="pf-panel space-y-3 p-4 sm:p-6">
        <legend className="sr-only">Job description</legend>
        <div className="ascii-rule mb-1">── JOB_DESCRIPTION ───────────────────────────────</div>
        <label htmlFor="jd" className="block font-mono text-[12px] text-ink">
          Paste the JD
        </label>
        <textarea
          id="jd"
          rows={8}
          value={inputs.jobDescription}
          onChange={(e) => set("jobDescription", e.target.value)}
          placeholder="Paste the full job description here…"
          className="w-full rounded-[3px] border border-ink/20 bg-cream px-3 py-2 font-mono text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
        />
        {errors.jobDescription && (
          <p className="font-mono text-[11px] text-coral">{errors.jobDescription}</p>
        )}
      </fieldset>

      {submitErr && (
        <p
          role="alert"
          className="rounded-[3px] border border-coral/40 bg-coral/5 px-3 py-2 font-mono text-[12px] text-coral"
        >
          {submitErr}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-[3px] bg-ink px-5 py-3.5 text-left font-mono text-[13px] font-medium text-cream transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="mr-2 text-coral">▸</span>
        {busy ? "Researching the company…" : "Research & build my prep brief"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-mono text-[12px] text-ink">
        {label}
        {optional && <span className="ml-2 text-mute">[optional]</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[3px] border border-ink/20 bg-cream px-3 py-2 font-mono text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
      />
      {error && <p className="mt-1 font-mono text-[11px] text-coral">{error}</p>}
    </div>
  );
}

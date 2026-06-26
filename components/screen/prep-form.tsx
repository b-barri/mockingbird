"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getKey, setKey, hasKey, clearKey } from "@/lib/auth/key-storage";
import { saveBrief } from "@/lib/screen/brief-store";
import type { Brief } from "@/lib/screen/brief";

// Screening-prep input form. Collects company, URL, role, and JD; validates;
// calls /api/research with the BYO LLM key; stores the returned brief
// client-side; navigates to the brief view.

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

    // Anthropic keys are pure printable ASCII. Copy-paste frequently smuggles
    // in non-ASCII artifacts (smart quotes, non-breaking spaces, zero-width
    // chars) that make fetch throw "non ISO-8859-1 code point" while building
    // the header. Strip anything outside printable ASCII so the request never
    // crashes on the key. A freshly typed key wins so a stale/bad stored one
    // can always be replaced.
    const sanitize = (s: string) => s.replace(/[^\x20-\x7E]/g, "").trim();
    const typed = sanitize(inlineKey);
    const apiKey = typed || sanitize(getKey("llm") ?? "");
    if (!apiKey) {
      setSubmitErr("Enter your Anthropic API key above to run the research.");
      return;
    }
    // Persist a freshly typed key (replacing any stored one) so re-runs in
    // this tab don't re-prompt.
    if (typed) setKey("llm", apiKey);

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
        const rawError = "error" in data ? data.error : "";
        // A 401 / auth error means the Anthropic key was rejected. A bad key
        // may be sitting in storage (which hides the key field), so clear it
        // and re-reveal the field so the user can paste a valid one.
        const isAuthError =
          res.status === 401 || /invalid x-api-key|authentication/i.test(rawError);
        if (isAuthError) {
          clearKey("llm");
          setKeyPresent(false);
          setInlineKey("");
          setSubmitErr(
            "Anthropic rejected that API key. Paste a valid key above and try again."
          );
          return;
        }
        setSubmitErr(rawError || `Research failed (${res.status}).`);
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
      <fieldset className="pf-panel space-y-3 p-4 sm:p-6">
        <legend className="sr-only">Anthropic API key</legend>
        <div className="ascii-rule mb-1">Anthropic key</div>
        {keyPresent ? (
          <p className="flex items-center gap-2 text-[12px] text-mute">
            <span className="pf-status-dot is-live" />
            <span className="text-coral">Key on file.</span> Saved in this browser.
            Leave blank to reuse it, or paste a new one to replace it.
          </p>
        ) : (
          <p className="text-[12px] leading-relaxed text-mute">
            Research runs on your key. It passes through to Anthropic and is
            never stored on our servers. The key stays in this browser.
          </p>
        )}
        <input
          id="anthropic-key"
          type="password"
          value={inlineKey}
          placeholder={keyPresent ? "Paste a new key to replace…" : "sk-ant-…"}
          onChange={(e) => setInlineKey(e.target.value)}
          className="pf-field"
        />
      </fieldset>

      <fieldset className="pf-panel space-y-4 p-4 sm:p-6">
        <legend className="sr-only">Where are you interviewing?</legend>
        <div className="ascii-rule mb-1">Where are you interviewing</div>

        <div>
          <Field
            id="company"
            label="Company"
            placeholder="Stripe"
            value={inputs.company}
            onChange={(v) => set("company", v)}
            error={errors.company}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {["Stripe", "Notion", "Linear"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("company", c)}
                className="rounded-[6px] border border-white/10 px-2.5 py-1 text-[12px] text-mute transition-colors duration-quick hover:border-coral hover:text-ink"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
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
        <div className="ascii-rule mb-1">Job description</div>
        <label htmlFor="jd" className="block text-[13px] font-medium text-ink">
          Paste the job description
        </label>
        <textarea
          id="jd"
          rows={8}
          value={inputs.jobDescription}
          onChange={(e) => set("jobDescription", e.target.value)}
          placeholder="Paste the full job description here. The more detail, the sharper the questions."
          className="pf-field resize-none"
        />
        {errors.jobDescription && (
          <p className="text-[12px] text-coral">{errors.jobDescription}</p>
        )}
      </fieldset>

      {submitErr && (
        <p
          role="alert"
          className="rounded-[8px] border border-coral/40 bg-coral/[0.08] px-3 py-2 text-[13px] text-coral"
        >
          {submitErr}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="pf-exec-btn w-full justify-start disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Researching the company…" : "Build my brief"}
        {!busy && <span className="kbd ml-auto">⌘ ↵</span>}
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
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
        {optional && <span className="ml-2 font-normal text-ink-faint">(optional)</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pf-field mt-1.5"
      />
      {error && <p className="mt-1 text-[12px] text-coral">{error}</p>}
    </div>
  );
}

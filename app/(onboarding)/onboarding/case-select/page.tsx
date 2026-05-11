"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PRODUCT_DESIGN_CASES, pickRandomCase } from "@/lib/llm/prompts/case-templates";

// F1 step 4 → step 6: case selection then session start. Empty-state copy
// when zero cases are configured. "Surprise me" picks a random case from
// the available library. useSearchParams requires a Suspense boundary at
// prerender time in Next.js 15 — wrapped accordingly.

function CaseSelectInner() {
  const router = useRouter();
  const params = useSearchParams();
  const llm = params.get("llm") ?? "anthropic";
  const voice = params.get("voice") ?? "cartesia";

  if (PRODUCT_DESIGN_CASES.length === 0) {
    return (
      <section className="text-center">
        <h1 className="font-display text-3xl tracking-tight text-ink">
          No cases configured
        </h1>
        <p className="mt-3 text-sm text-mute">
          The operator must add cases under{" "}
          <code className="font-mono text-xs">
            lib/llm/prompts/case-templates/
          </code>{" "}
          before sessions can run.
        </p>
        <Link
          href="/onboarding"
          className="mt-8 inline-block text-sm text-coral hover:underline"
        >
          ← Back to key entry
        </Link>
      </section>
    );
  }

  function startCase(caseId: string) {
    router.push(`/session?case=${caseId}&llm=${llm}&voice=${voice}`);
  }

  function surpriseMe() {
    const random = pickRandomCase();
    startCase(random.id);
  }

  return (
    <>
      <header className="mb-10">
        <div className="mb-4 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-coral">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" /> Onboarding · step 2 of 2
        </div>
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Pick a Product Design case.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          {PRODUCT_DESIGN_CASES.length} cases available. Pick one, or have us
          pick for you.
        </p>
      </header>

      <div className="grid gap-3">
        {PRODUCT_DESIGN_CASES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => startCase(c.id)}
            data-testid={`case-${c.id}`}
            className="group rounded-xl border border-ink/[0.08] bg-white p-5 text-left transition-colors hover:border-ink/[0.22]"
          >
            <h2 className="font-display text-xl tracking-tight text-ink">
              {c.title}
            </h2>
            <p className="mt-1 text-sm text-mute">{c.brief}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-mute">
              <span>~{c.estimatedMinutes} min</span>
              <span className="text-coral opacity-0 transition-opacity group-hover:opacity-100">
                Start case →
              </span>
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={surpriseMe}
          data-testid="surprise-me"
          className="rounded-xl border border-dashed border-ink/[0.15] bg-cream/40 p-5 text-center font-display text-lg italic tracking-tight text-mute hover:border-coral/40 hover:text-ink"
        >
          Surprise me — pick at random ✦
        </button>
      </div>

      <p className="mt-10 text-center text-xs text-mute">
        <Link href="/onboarding" className="hover:text-ink">
          ← Back to key entry
        </Link>
      </p>
    </>
  );
}

export default function CaseSelectPage() {
  return (
    <main className="mx-auto max-w-2xl px-8 py-section">
      <Suspense
        fallback={
          <div className="py-section text-center text-sm text-mute">
            Loading…
          </div>
        }
      >
        <CaseSelectInner />
      </Suspense>
    </main>
  );
}

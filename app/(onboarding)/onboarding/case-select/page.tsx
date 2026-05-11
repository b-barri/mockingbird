"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  PRODUCT_DESIGN_CASES,
  pickRandomCase,
} from "@/lib/llm/prompts/case-templates";

// F1 step 4 → step 6: case-TYPE selection then session start. Real PM
// interviews don't show candidates the bank of possible cases — you pick
// the case TYPE you want to practice, and a specific question is assigned
// at random when the session begins. Empty-state copy when zero cases are
// configured. useSearchParams requires a Suspense boundary at prerender
// time in Next.js 15.

interface CaseType {
  readonly id: "product-design" | "strategy" | "estimation" | "behavioral";
  readonly title: string;
  readonly description: string;
  readonly bankSize: number;
  readonly available: boolean;
}

const CASE_TYPES: ReadonlyArray<CaseType> = [
  {
    id: "product-design",
    title: "Product Design",
    description:
      "User-centric design cases. Clarify, segment, prioritize, prototype. Most common at Google, Meta, and most consumer companies.",
    bankSize: PRODUCT_DESIGN_CASES.length,
    available: true,
  },
  {
    id: "strategy",
    title: "Strategy",
    description:
      "Market entry, competitive response, expansion bets. Common in second rounds.",
    bankSize: 0,
    available: false,
  },
  {
    id: "estimation",
    title: "Estimation",
    description:
      "Market sizing, back-of-the-envelope math. Sometimes folded into design rounds.",
    bankSize: 0,
    available: false,
  },
  {
    id: "behavioral",
    title: "Behavioral",
    description:
      "Past-projects, leadership scenarios, conflict navigation. Saved for V2.",
    bankSize: 0,
    available: false,
  },
];

function CaseSelectInner() {
  const router = useRouter();
  const params = useSearchParams();
  const llm = params.get("llm") ?? "anthropic";
  const voice = params.get("voice") ?? "cartesia";
  const [selectedType, setSelectedType] =
    useState<CaseType["id"]>("product-design");

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

  function startCase() {
    // V1 only has product-design cases; the typed selector is forward-compat.
    const picked = pickRandomCase();
    router.push(`/session?case=${picked.id}&llm=${llm}&voice=${voice}`);
  }

  return (
    <>
      <header className="mb-10">
        <div className="mb-4 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-coral">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" /> Onboarding · step 2 of 2
        </div>
        <h1 className="font-display text-4xl tracking-tight text-ink">
          Pick a case type.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          Like a real interview — you pick the type, the question is dealt at
          random when you start. No previewing the bank.
        </p>
      </header>

      <div className="grid gap-3" role="radiogroup" aria-label="Case type">
        {CASE_TYPES.map((t) => {
          const isSelected = selectedType === t.id;
          const isDisabled = !t.available;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => !isDisabled && setSelectedType(t.id)}
              data-testid={`case-type-${t.id}`}
              data-selected={isSelected}
              className="group rounded-xl border bg-white p-5 text-left transition-colors data-[selected=true]:border-ink data-[selected=true]:ring-1 data-[selected=true]:ring-ink data-[selected=false]:border-ink/[0.08] hover:data-[selected=false]:border-ink/[0.22] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl tracking-tight text-ink">
                  {t.title}
                </h2>
                {!t.available && (
                  <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-mute">
                    Coming in V2
                  </span>
                )}
                {t.available && (
                  <span className="text-xs text-mute">
                    {t.bankSize} questions in bank
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-mute">{t.description}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={startCase}
        data-testid="start-case"
        className="mt-8 w-full rounded-lg bg-ink py-3 text-sm font-semibold text-cream transition-colors hover:bg-ink/85"
      >
        Deal me a {CASE_TYPES.find((t) => t.id === selectedType)?.title} case →
      </button>

      <p className="mt-6 text-center text-xs text-mute">
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

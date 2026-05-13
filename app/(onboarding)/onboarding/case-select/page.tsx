"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  PRODUCT_DESIGN_CASES,
  pickRandomCase,
} from "@/lib/llm/prompts/case-templates";

// F1 step 4 → step 6: case-TYPE selection then session start. Real PM
// interviews don't show candidates the bank of possible cases — you pick
// the case TYPE you want to practice, and a specific question is assigned
// at random when the session begins.

interface CaseType {
  readonly id: "product-design" | "strategy" | "estimation" | "behavioral";
  readonly title: string;
  readonly description: string;
  readonly bankSize: number;
  readonly available: boolean;
  readonly difficulty: number;
  readonly timeEstMin: number;
}

const CASE_TYPES: ReadonlyArray<CaseType> = [
  {
    id: "product-design",
    title: "Product Design",
    description:
      "The bread-and-butter. Clarify, segment, prioritize, sketch a solution out loud.",
    bankSize: PRODUCT_DESIGN_CASES.length,
    available: true,
    difficulty: 3,
    timeEstMin: 30,
  },
  {
    id: "strategy",
    title: "Strategy",
    description:
      "Market entry, competitive response, big-bet framing.",
    bankSize: 0,
    available: false,
    difficulty: 4,
    timeEstMin: 45,
  },
  {
    id: "estimation",
    title: "Estimation",
    description:
      "Market sizing and back-of-the-envelope math.",
    bankSize: 0,
    available: false,
    difficulty: 2,
    timeEstMin: 25,
  },
  {
    id: "behavioral",
    title: "Behavioral",
    description:
      "Past projects, leadership stories, the conflict you navigated.",
    bankSize: 0,
    available: false,
    difficulty: 2,
    timeEstMin: 30,
  },
];

function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function CaseSelectInner() {
  const router = useRouter();
  const params = useSearchParams();
  const llm = params.get("llm") ?? "anthropic";
  const voice = params.get("voice") ?? "cartesia";
  const [selectedType, setSelectedType] =
    useState<CaseType["id"]>("product-design");

  // Auto-focus the start button on mount (a case is pre-selected) and on
  // subsequent selection changes. Keyboard candidates can land on the page
  // and immediately press Enter; mouse users get the same experience as
  // before since hover/click still works on the unfocused button.
  const startButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    startButtonRef.current?.focus();
  }, [selectedType]);

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
    const picked = pickRandomCase();
    router.push(`/session?case=${picked.id}&llm=${llm}&voice=${voice}`);
  }

  const selected = CASE_TYPES.find((t) => t.id === selectedType);

  return (
    <>
      <div className="mb-4 font-mono text-[11px] tracking-wide text-coral">
        [STEP 2/2]&nbsp;&nbsp;DRAFT_CASE_TYPE
      </div>

      <h1 className="mb-3 font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-5xl sm:leading-[1.0] md:text-6xl">
        Pick your poison.
      </h1>
      <p className="mb-8 font-mono text-[13px] leading-relaxed text-mute sm:mb-10">
        // you pick the type. we deal the question. no peeking at the bank.
      </p>

      <div className="brand-image-glow mb-10 sm:mb-12">
        <Image
          src="/branding/choose_option.png"
          alt="Ember considering which case to pick"
          width={1914}
          height={822}
          priority
          className="w-full rounded-2xl shadow-[0_24px_50px_-22px_rgba(26,22,18,0.40)] ring-1 ring-ink/[0.08]"
        />
      </div>

      <div className="ascii-rule mb-6">
        ── BANK ─────────────────────────────────────────────────────────
      </div>

      <div className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="Case type">
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
              className="pf-panel relative rounded-md p-5 text-left transition-shadow disabled:cursor-not-allowed disabled:opacity-55 data-[selected=true]:bg-cream data-[selected=true]:border-transparent data-[selected=true]:shadow-[inset_0_0_0_2px_#E85D3B]"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-display text-2xl leading-tight tracking-tight text-ink">
                  {t.title}
                </h2>
                {isSelected && !isDisabled && (
                  <span className="font-mono text-[10px] font-semibold text-coral">
                    SELECTED
                  </span>
                )}
                {isDisabled && (
                  <span className="font-mono text-[10px] text-mute">
                    COOKING
                  </span>
                )}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-mute">
                {t.description}
              </p>
              <div className="mt-3 border-t border-dashed border-ink/15 pt-3 font-mono text-[11px] leading-relaxed text-mute">
                <div>DIFFICULTY {stars(t.difficulty)}</div>
                <div>BANK&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{t.bankSize} questions</div>
                <div>TIME&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~{t.timeEstMin} min</div>
                <div>
                  STATUS&nbsp;&nbsp;&nbsp;&nbsp;
                  <span className={isDisabled ? "text-mute" : "text-coral"}>
                    {isDisabled ? "COOKING · V2" : "LIVE"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-10 mb-2 font-mono text-[11px] text-mute">
        // ready? hit it.
      </p>
      <button
        ref={startButtonRef}
        type="button"
        onClick={startCase}
        data-testid="start-case"
        className="group flex w-full items-center justify-between gap-4 rounded-[3px] bg-ink px-5 py-4 text-left font-mono text-[13px] font-medium text-cream shadow-[0_4px_14px_-4px_rgba(232,93,59,0.4)] ring-1 ring-coral/30 transition-all hover:bg-coral hover:shadow-[0_6px_18px_-4px_rgba(232,93,59,0.6)] hover:ring-2 hover:ring-coral/60 focus-visible:bg-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/70"
      >
        <span className="flex-1 truncate">
          <span className="mr-2 text-coral transition-colors group-hover:text-cream">▸</span>
          deal_random_case --type {selected?.id}
          <span className="animate-caret-blink text-cream/85" aria-hidden>
            _
          </span>
        </span>
        <span className="hidden shrink-0 text-[11px] uppercase tracking-wider text-cream/60 transition-colors group-hover:text-cream sm:inline">
          Press ↵ to deal&nbsp;→
        </span>
      </button>

      <p className="mt-5 font-mono text-[11px] text-mute">
        <Link href="/onboarding" className="hover:text-ink">
          $ cd ../onboarding
        </Link>
      </p>
    </>
  );
}

export default function CaseSelectPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 pt-10 pb-section sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
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

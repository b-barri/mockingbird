"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import {
  PRODUCT_DESIGN_CASES,
  pickRandomCase,
} from "@/lib/llm/prompts/case-templates";
import { AppContainer } from "@/components/shell/app-container";

// F1 step 4 → step 6: case-TYPE selection then session start. Real PM
// interviews don't show candidates the bank of possible cases — you pick the
// case type you want to practice, and a specific question is assigned at random
// when the session begins. Product Design is the one live type today; the rest
// are honestly flagged as coming in V2 rather than shown as a wall of dead cards.

const PRODUCT_DESIGN = {
  title: "Product Design",
  description:
    "The bread-and-butter. Clarify the prompt, segment users, prioritize, and sketch a solution out loud.",
  difficulty: 3,
  timeEstMin: 30,
};

const COMING_SOON = ["Strategy", "Estimation", "Behavioral"];

function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function CaseSelectInner() {
  const router = useRouter();
  const params = useSearchParams();
  const llm = params.get("llm") ?? "anthropic";
  const voice = params.get("voice") ?? "cartesia";

  // Auto-focus the start button on mount so a keyboard candidate can press
  // Enter immediately; mouse users are unaffected.
  const startButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    startButtonRef.current?.focus();
  }, []);

  if (PRODUCT_DESIGN_CASES.length === 0) {
    return (
      <section>
        <h1 className="font-sans text-3xl font-semibold tracking-[-0.02em] text-ink">
          No cases configured
        </h1>
        <p className="mt-3 text-[14px] text-ink-2">
          The operator needs to add cases under{" "}
          <code className="font-mono text-[12px] text-ink">
            lib/llm/prompts/case-templates/
          </code>{" "}
          before sessions can run.
        </p>
        <Link
          href="/onboarding"
          className="mt-8 inline-block text-[13px] text-coral hover:underline"
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

  return (
    <>
      <div className="ascii-rule mb-4 text-coral">
        Step 2 of 2 · Choose a case type
      </div>

      <h1 className="mb-3 font-sans text-4xl font-semibold leading-[1.05] tracking-[-0.022em] text-ink sm:text-5xl">
        Choose a case type.
      </h1>
      <p className="mb-8 text-[14px] leading-relaxed text-ink-2 sm:mb-10">
        You pick the type. We deal the question at random. No peeking at the
        bank.
      </p>

      <div className="brand-image-glow mb-10 sm:mb-12">
        <Image
          src="/branding/choose_option.png"
          alt="Ember considering which case to pick"
          width={1914}
          height={822}
          priority
          className="w-full rounded-xl ring-1 ring-white/[0.08]"
        />
      </div>

      <div className="ascii-rule mb-6">Case type</div>

      {/* The one live case type. Selected by default; metadata reads as a spec. */}
      <div className="pf-panel p-5" data-testid="case-type-product-design">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-sans text-2xl font-semibold leading-tight tracking-[-0.02em] text-ink">
            {PRODUCT_DESIGN.title}
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-coral">
            Live
          </span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          {PRODUCT_DESIGN.description}
        </p>
        <dl className="mt-3 space-y-1 border-t border-white/[0.08] pt-3 text-[12px] text-mute">
          <div className="flex justify-between">
            <dt>Difficulty</dt>
            <dd className="text-ink-2">{stars(PRODUCT_DESIGN.difficulty)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Bank</dt>
            <dd className="tabular-nums text-ink-2">
              {PRODUCT_DESIGN_CASES.length} questions
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Time</dt>
            <dd className="tabular-nums text-ink-2">
              ~{PRODUCT_DESIGN.timeEstMin} min
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-4 text-[13px] text-mute">
        {COMING_SOON.join(", ")} are coming in V2.
      </p>

      <button
        ref={startButtonRef}
        type="button"
        onClick={startCase}
        data-testid="start-case"
        className="pf-exec-btn mt-8 w-full justify-start"
      >
        Deal me a case
        <span className="kbd ml-auto">↵</span>
      </button>

      <p className="mt-5 text-[13px] text-mute">
        <Link href="/onboarding" className="hover:text-ink">
          ← Back to key entry
        </Link>
      </p>
    </>
  );
}

export default function CaseSelectPage() {
  return (
    <AppContainer>
      <Suspense
        fallback={
          <div className="py-section text-[13px] text-mute">Loading…</div>
        }
      >
        <CaseSelectInner />
      </Suspense>
    </AppContainer>
  );
}

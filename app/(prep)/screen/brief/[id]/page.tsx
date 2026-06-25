"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BriefView } from "@/components/screen/brief-view";
import { ScreenCall } from "@/components/screen/screen-call";
import { loadBrief } from "@/lib/screen/brief-store";
import type { Brief } from "@/lib/screen/brief";

// U3: brief display route. The brief lives in client sessionStorage (written by
// the prep form), so this loads after mount. "loading" until the effect runs;
// "missing" if the id isn't in this tab's storage (e.g. a shared/stale link).

type LoadState = "loading" | "missing" | "ready";

export default function BriefPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const [brief, setBrief] = useState<Brief | null>(null);

  useEffect(() => {
    const found = params?.id ? loadBrief(params.id) : null;
    if (found) {
      setBrief(found);
      setState("ready");
    } else {
      setState("missing");
    }
  }, [params?.id]);

  return (
    <main className="mx-auto max-w-3xl px-4 pt-10 pb-section sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
      {state === "loading" && (
        <p className="font-mono text-[13px] text-mute">// loading brief…</p>
      )}

      {state === "missing" && (
        <div className="space-y-4">
          <p className="font-mono text-[13px] text-ink">
            // no brief found for this link in this tab.
          </p>
          <Link
            href="/screen"
            className="inline-block rounded-[3px] bg-ink px-4 py-2 font-mono text-[12px] text-cream hover:bg-ink/85"
          >
            <span className="mr-2 text-coral">▸</span> Build a new brief
          </Link>
        </div>
      )}

      {state === "ready" && brief && (
        <div className="space-y-8">
          <BriefView brief={brief} />
          <ScreenCall brief={brief} />
        </div>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BriefView } from "@/components/screen/brief-view";
import { ScreenCall } from "@/components/screen/screen-call";
import { AppContainer } from "@/components/shell/app-container";
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
    <AppContainer>
      {state === "loading" && (
        <p className="flex items-center gap-2 text-[13px] text-ink-2">
          <span className="pulse-dot" /> Loading brief…
        </p>
      )}

      {state === "missing" && (
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-ink-2">
            No brief for this link in this tab. Briefs stay in the browser that
            built them, so build a fresh one to continue.
          </p>
          <Link href="/screen" className="pf-exec-btn">
            Build a new brief
          </Link>
        </div>
      )}

      {state === "ready" && brief && (
        <div className="space-y-8">
          <BriefView brief={brief} />
          <ScreenCall brief={brief} />
        </div>
      )}
    </AppContainer>
  );
}

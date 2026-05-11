import { clsx } from "clsx";
import type { VoiceStateKind } from "@/lib/voice/types";

interface OrbProps {
  /** Current voice agent state. Drives the visual variant. */
  state: VoiceStateKind;
  /** Visual size variant. */
  size?: "default" | "small";
}

// Port of mocks/v2-three-panel.html orb: coral radial gradient, two
// expanding rings on listening/speaking, dimmed greyed-out variant for
// error states. R9 requires both orb animation AND status text — see
// VoiceStage for the text companion.
export function Orb({ state, size = "default" }: OrbProps) {
  const isError =
    state === "mic-permission-denied" ||
    state === "network-drop" ||
    state === "asr-no-result" ||
    state === "key-invalid" ||
    state === "provider-timeout";
  const isActive = state === "listening" || state === "speaking";

  const wrapperSize = size === "small" ? "h-12 w-12" : "h-[200px] w-[200px]";
  const orbSize = size === "small" ? "h-10 w-10" : "h-[156px] w-[156px]";

  return (
    <div
      data-testid="voice-orb"
      data-state={state}
      className={clsx(
        "relative flex items-center justify-center",
        wrapperSize
      )}
    >
      {isActive && (
        <>
          <div
            className="absolute inset-0 rounded-full border border-coral/20 animate-ring-expand"
            aria-hidden
          />
          <div
            className="absolute inset-0 rounded-full border border-coral/20 animate-ring-expand"
            style={{ animationDelay: "1.3s" }}
            aria-hidden
          />
        </>
      )}
      <div
        className={clsx(
          "rounded-full shadow-[0_30px_70px_rgba(232,93,59,0.28),0_0_0_1px_rgba(255,255,255,0.5)_inset]",
          orbSize,
          {
            "animate-orb-pulse": !isError && state !== "idle",
            "bg-[radial-gradient(circle_at_32%_30%,#FF8A5E,#F26A3E_35%,#C84415_75%,#8E2E0A)]":
              !isError,
            "bg-[radial-gradient(circle_at_32%_30%,#999,#666_75%)] opacity-50":
              isError,
            "bg-[radial-gradient(circle_at_32%_30%,#bbb,#888_75%)] opacity-60":
              state === "idle",
          }
        )}
        aria-hidden
      />
    </div>
  );
}

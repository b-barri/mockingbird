import type { Config } from "tailwindcss";

// R4 design tokens — the constrained aesthetic system referenced from
// pm-interview-buddy/docs/brainstorms/2026-05-11-pm-interview-voice-agent-requirements.md
// Single source of truth for the cream/ink/coral palette and the typography
// pairing (Instrument Serif display, Inter UI, JetBrains Mono code/timer).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F4ED",
        ink: "#1A1612",
        coral: "#E85D3B",
        mute: "#6B5F50",
        tan: "#EDE5D6",
      },
      fontFamily: {
        display: ["'Instrument Serif'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      spacing: {
        section: "5rem", // R4: minimum 80px vertical gap between sections
      },
      fontFeatureSettings: {
        ss: '"ss01", "ss02", "cv11"',
      },
      animation: {
        "orb-pulse": "orbPulse 3.5s ease-in-out infinite",
        "ring-expand": "ringExpand 2.8s ease-out infinite",
        "caret-blink": "caret 1s steps(2) infinite",
      },
      keyframes: {
        orbPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.035)" },
        },
        ringExpand: {
          "0%": { transform: "scale(0.88)", opacity: "0.9" },
          "100%": { transform: "scale(1.18)", opacity: "0" },
        },
        caret: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

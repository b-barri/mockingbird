import type { Config } from "tailwindcss";

// R4 design tokens — the constrained aesthetic system referenced from
// pm-interview-buddy/docs/brainstorms/2026-05-11-pm-interview-voice-agent-requirements.md
// Single source of truth for the cream/ink/coral palette and the typography
// pairing (Instrument Serif display, Inter UI, JetBrains Mono code/timer).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Linear-direction dark palette. Token NAMES are kept for migration
      // leverage but their meaning is now inverted: `cream` is the near-black
      // base, `ink` is the off-white foreground, `tan` is the panel surface.
      // (Naming debt — rename to bg/fg/surface in the component sweep.)
      // `coral` stays the single accent (Linear uses indigo here; we don't).
      colors: {
        cream: "#08090A", // base background (Linear near-black)
        ink: "#F7F8F8", // primary foreground (off-white)
        coral: "#E85D3B", // the single rationed accent — unchanged
        mute: "#8A8F98", // muted gray — micro-labels, meta
        tan: "#141517", // standard panel / card surface
        // Dark surface ladder + foreground scale.
        "surface-hover": "#1F2023", // hovered / featured panel (elevation step 2)
        raised: "#18191B", // inputs, menus, popovers — relies on its border
        "ink-2": "#9CA0A8", // secondary reading text where full ink is too bright
        "ink-faint": "#5C5F66", // disabled / deselected
      },
      fontFamily: {
        display: ["var(--font-display)", "'Instrument Serif'", "serif"],
        sans: ["var(--font-sans)", "'Inter'", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      spacing: {
        section: "5rem", // R4: minimum 80px vertical gap between sections
      },
      borderRadius: {
        // Linear-direction ladder — softer than the old terminal sharpness.
        tag: "6px",
        control: "8px",
        panel: "12px",
      },
      transitionDuration: {
        // Fast, asymmetric motion (Linear-inspired). Brand motion lives in
        // globals.css keyframes and is exempt from these.
        quick: "100ms",
        dismiss: "150ms",
        regular: "180ms",
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

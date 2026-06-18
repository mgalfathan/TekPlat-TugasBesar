import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // THE GAFFER — editorial sports theme (warm near-black + electric lime)
        bg: "#0b0c08",
        panel: "#13140e",
        "panel-2": "#191b11",
        elev: "#1d1f14",
        border: "rgba(255,255,255,.07)",
        "border-2": "rgba(255,255,255,.13)",
        ink: "#f4f5ec",
        muted: "#8d8f7e",
        "muted-2": "#5f6052",
        lime: "#c8f23a",
        "lime-ink": "#0b0c08",
        win: "#74e6a4",
        draw: "#9ea08e",
        loss: "#f5837f",
        "chart-blue": "#5aa9f0",
      },
      fontFamily: {
        display: ["var(--font-anton)", "sans-serif"],
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: {
        card: "16px",
        inset: "14px",
        chip: "8px",
        pill: "99px",
      },
      maxWidth: {
        page: "1240px",
      },
    },
  },
  plugins: [],
};

export default config;

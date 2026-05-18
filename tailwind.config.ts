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
        sport: {
          green: "#00d4aa",
          blue: "#0ea5e9",
          dark: "#0a0f1e",
          card: "#111827",
          border: "#1f2937",
          muted: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};

export default config;

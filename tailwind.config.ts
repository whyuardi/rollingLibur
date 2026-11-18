import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        "ink-deep": "#000000",
        muted: "#555555",
        faint: "#8a8a8a",
        hairline: "#d9d9d9",
        "hairline-soft": "#e8e8e8",
        paper: "#ffffff",
        wash: "#f4f4f4",
      },
      fontFamily: {
        sans: [
          "var(--font-plex-sans)",
          "IBM Plex Sans",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "var(--font-plex-mono)",
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

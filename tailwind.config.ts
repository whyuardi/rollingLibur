import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cobalt: "#0064E0",
        "cobalt-deep": "#0143b5",
        "cobalt-soft": "rgba(0, 100, 224, 0.08)",
        ink: "#14161a",
        "ink-deep": "#0a1317",
        charcoal: "#333333",
        slate: "#5b6670",
        steel: "#8a94a0",
        stone: "#b0b6bd",
        hairline: "#e3e6e8",
        "hairline-soft": "#eceef0",
        "surface-soft": "#f5f6f7",
        canvas: "#ffffff",
        success: "#1a7f37",
        "success-soft": "#e6f4ea",
        warning: "#f7b500",
        "warning-soft": "#fff6db",
        critical: "#c81e1e",
      },
      fontFamily: {
        sans: [
          "Montserrat",
          "Helvetica",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
      },
      borderRadius: {
        xxxl: "32px",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — deep, trustworthy blue (header, brand surfaces, navigation)
        // Calibrated towards Snabbit / Pronto / Cabify trust-blues.
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // Accent — warm yellow (CTAs, highlights, energy)
        // Tuned towards Snabbit's "get-it-now" yellow.
        accent: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
        },
      },
      backgroundImage: {
        // Trust-first hero — deep blue radial.
        "brand-gradient":
          "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)",
        // Energy CTA — yellow → amber, prints great.
        "accent-gradient":
          "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
        "soft-gradient":
          "linear-gradient(180deg, #eff6ff 0%, #fefce8 100%)",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
        glow: "0 8px 32px -8px rgba(37,99,235,0.35)",
        "glow-accent": "0 8px 32px -8px rgba(234,179,8,0.45)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

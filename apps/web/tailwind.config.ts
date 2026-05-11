import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        background: "#050505", // Deep graphite
        foreground: "#ededed",
        surface: {
          DEFAULT: "#0a0a0a",
          hover: "#121212",
          border: "#1f1f1f",
        },
        protocol: {
          violet: "#6b21a8", // Primary violet accent
          violetGlow: "rgba(107, 33, 168, 0.4)",
          cyan: "#06b6d4",   // Secondary cyan accent
          cyanGlow: "rgba(6, 182, 212, 0.4)",
          muted: "rgba(255, 255, 255, 0.04)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "protocol-gradient": "linear-gradient(135deg, rgba(107,33,168,0.1) 0%, rgba(6,182,212,0.05) 100%)",
      },
      boxShadow: {
        "protocol-glow": "0 0 30px -10px rgba(107, 33, 168, 0.3)",
        "protocol-cyan-glow": "0 0 30px -10px rgba(6, 182, 212, 0.3)",
        "premium": "0 10px 40px -10px rgba(0, 0, 0, 0.8)",
      },
      animation: {
        "fade-in": "fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

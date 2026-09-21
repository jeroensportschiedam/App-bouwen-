import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
        },
        walnut: {
          DEFAULT: "var(--walnut)",
          light: "var(--walnut-light)",
        },
        oxblood: {
          DEFAULT: "var(--oxblood)",
          light: "var(--oxblood-light)",
        },
        koper: {
          DEFAULT: "var(--koper)",
          light: "var(--koper-light)",
        },
        greige: "var(--greige)",
        paper: {
          DEFAULT: "var(--paper)",
          dim: "var(--paper-dim)",
        },
      },
      fontFamily: {
        heading: "var(--font-heading)",
        body: "var(--font-body)",
      },
      maxWidth: {
        content: "1180px",
      },
      backgroundImage: {
        lamellen:
          "repeating-linear-gradient(90deg, rgba(247,245,241,0.06) 0px, rgba(247,245,241,0.06) 1px, transparent 1px, transparent 28px)",
      },
      boxShadow: {
        koper: "0 0 0 1px var(--koper)",
      },
    },
  },
  plugins: [],
};

export default config;

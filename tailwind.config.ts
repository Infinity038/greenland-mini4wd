import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red:   "#D01B1B",
          dark:  "#0D0D0D",
          navy:  "#0F1923",
          gold:  "#F5C518",
          light: "#F4F4F0",
        },
      },
      fontFamily: {
        barlow: ["'Barlow Condensed'", "sans-serif"],
        dm:     ["'DM Sans'",          "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
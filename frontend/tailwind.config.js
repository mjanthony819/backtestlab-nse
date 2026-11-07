module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#02070A", panel: "#071A24", line: "#14384A", "line-soft": "#1A4557",
        ink: "#FFFFFF", body: "#D8D8DC", dim: "#9A9AA2", faint: "#6B6B73",
        blue: "#0297DE", "blue-deep": "#FC734D", up: "#4fd1a0", down: "#ff6b7a", amber: "#e8b24a",
      },
      fontFamily: {
        serif: ["'Instrument Serif'", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        pixel: ["Inter", "system-ui", "sans-serif"],
        doto: ["Doto", "monospace"],
        mono: ["'Space Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

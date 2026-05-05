/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic text-color scale derived from the WCAG AA audit.
        // Use as `text-text-primary`, `text-text-muted`, etc. Each token is
        // verified against #ffffff to meet AA (4.5:1) for normal text.
        text: {
          primary: "#111827", // gray-900 — headings; 17.74:1 vs white
          body: "#374151", //    gray-700 — body copy; 10.31:1 vs white
          muted: "#4b5563", //   gray-600 — secondary text; 7.56:1 vs white
          hint: "#6b7280", //    gray-500 — captions/hints; 4.83:1 vs white (AA min)
        },
      },
      boxShadow: {
        // Soft elevation tokens for card surfaces sitting on bg-slate-50.
        // Layered shadows feel softer than a single drop shadow.
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        "card-hover":
          "0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};


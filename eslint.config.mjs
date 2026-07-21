// eslint-config-next v16 ships native flat configs; wrapping them in
// FlatCompat crashes ESLint ("Converting circular structure to JSON").
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,

  // The React-Compiler-era hooks rules flag long-standing patterns across
  // the app (chat widget, quiz, sidebar, uploader). Keep them visible as
  // warnings without blocking CI; fix the underlying patterns separately.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },

  {
    ignores: [
      "lib/generated/**",
      "src/generated/**",
      "coverage/**",
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
    ],
  },
];

export default eslintConfig;

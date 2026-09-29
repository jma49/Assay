import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Rules eslint-config-next 16 added over 15: the React Compiler rules of
// eslint-plugin-react-hooks 7 and a location-assign check. The app does not
// use the React Compiler, and sign-out and the error boundary reload the page
// on purpose; adopting these rules is its own change.
const RULES_NEW_IN_NEXT_16 = [
  "react-hooks/config",
  "react-hooks/error-boundaries",
  "react-hooks/gating",
  "react-hooks/globals",
  "react-hooks/immutability",
  "react-hooks/incompatible-library",
  "react-hooks/preserve-manual-memoization",
  "react-hooks/purity",
  "react-hooks/refs",
  "react-hooks/set-state-in-effect",
  "react-hooks/set-state-in-render",
  "react-hooks/static-components",
  "react-hooks/unsupported-syntax",
  "react-hooks/use-memo",
  "@next/next/no-location-assign-relative-destination",
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      ...Object.fromEntries(RULES_NEW_IN_NEXT_16.map((rule) => [rule, "off"])),
    },
  },
  globalIgnores(["node_modules/**", ".next/**", ".visual/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

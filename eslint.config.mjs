import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
export default defineConfig([
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  globalIgnores([
    ".next/**",
    "out/**",
    ".backend-archive/**",
    "Demo/**",
    "qa/**",
    "snapshots/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
  ]),
  // Existing visual components intentionally set animation readiness in effects.
  {
    files: [
      "components/motion/**",
      "components/three/**",
      "components/sections/**",
      "components/projects/**",
      "components/booking/**",
      "hooks/**",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
]);

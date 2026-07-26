// ESLint flat config.
//
// `npm run lint` had been broken since ESLint 9 switched to flat config: the
// script existed but no config file and no ESLint packages did, so it failed
// before linting anything. Next 16 also removed `next lint`.
//
// eslint-config-next 16 ships native flat configs, so the presets are imported
// and spread directly. (The older FlatCompat route fails against it — the
// legacy validator chokes on the plugin object graph.)
//
// Scope note: this repo had never been linted, so turning it on surfaces a
// backlog in files unrelated to any current change. Rather than blanket-
// disabling rules to force a green run, the genuinely noisy pre-existing
// categories are set to "warn" (visible, non-blocking) while everything that
// indicates a real defect stays an error. Nothing is silenced outright.

import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypeScript from "eslint-config-next/typescript"

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Generated mock data — thousands of literal rows, nothing to lint.
      "lib/generated-suppliers.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // Pre-existing backlog across the prototype's UI code. Warnings keep them
      // visible without blocking; they are not errors that indicate a defect.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
]

export default eslintConfig

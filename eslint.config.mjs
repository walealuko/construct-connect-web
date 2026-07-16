// ESLint flat config for Next.js 16. eslint-config-next@16 ships
// flat configs directly (no FlatCompat bridge needed), so we import
// them as flat config arrays. `next lint` was removed in Next 16,
// so the lint script in package.json invokes `eslint .` directly
// and picks up this file.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // The codebase is on React 18. The React Compiler / React 19
      // rules in next/typescript flag patterns that are correct in
      // 18 but are gated by the React 19 compile-time checks.
      // They're noise here, but they'll be the right rules when we
      // upgrade to React 19 — re-evaluate at that point.
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/component-hook-factories": "off",
      "react-hooks/config": "off",
      "react-hooks/globals": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/unsupported-syntax": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
      "react-hooks/void-dom-elements-no-children": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // `any` is widespread in this codebase (mostly `.from('x')`
      // chain results and event payloads). Tightening this is real
      // work, not a config change — deferred.
      "@typescript-eslint/no-explicit-any": "off",
      // Apostrophes inside JSX text trip this rule ("you're", "we've",
      // etc.). Fixing requires either escaping every one or wrapping
      // in {'...'}, neither of which is worth the churn.
      "react/no-unescaped-entities": "off",
      // `<a href="...">` and `<img>` are flagged by Next rules in
      // favor of next/link and next/image. The remaining sites are
      // intentional (e.g. external payment links, the no-image.svg
      // fallback). Address case-by-case in code review.
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      // Underscore-prefixed unused args/vars are allowed by the rule
      // pattern below; the `^_` patterns let the rest of the
      // codebase clean up incrementally without mass renames.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;

// eslint-config-next 16 ships flat config directly, so it is spread as-is —
// FlatCompat is only needed for the older .eslintrc-style presets.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "public/**"],
  },
];

export default config;

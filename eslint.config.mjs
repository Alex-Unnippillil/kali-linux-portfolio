import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import security from "eslint-plugin-security";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

const nextCoreWebVitals = compat
    .extends("next/core-web-vitals")
    .map((config) => ({
        ...config,
        plugins: { "@next/next": nextPlugin, ...(config.plugins ?? {}) },
    }));

export default defineConfig([
    ...nextCoreWebVitals,
    globalIgnores(["components/apps/breakout.js"]),
    {
        extends: compat.extends("plugin:security/recommended-legacy", "prettier"),

        plugins: {
            security,
        },

        rules: {
            "@next/next/no-page-custom-font": "off",
            "@next/next/no-img-element": "off",
            "security/detect-object-injection": "off",

            "no-restricted-imports": ["error", {
                patterns: ["../components/apps/*", "./components/apps/*", "components/apps/*"],
            }],
        },
    }, {
        files: ["**/apps.config.js"],

        rules: {
            "no-restricted-imports": "off",
        },
    }, {
        files: ["**/__tests__/**"],
        rules: {
            "no-restricted-imports": "off",
            "react/display-name": "off",
        },
    }]);

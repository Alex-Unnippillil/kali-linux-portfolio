import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import security from "eslint-plugin-security";
import node from "eslint-plugin-node";
import jsxA11y from "eslint-plugin-jsx-a11y";
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

export default defineConfig([
    globalIgnores(["components/apps/breakout.js"]),
    {
        extends: compat.extends(
            "plugin:@next/next/recommended",
            "plugin:jsx-a11y/recommended",
            "plugin:security/recommended-legacy",
            "prettier"
        ),

        plugins: {
            "@next/next": nextPlugin,
            security,
            "jsx-a11y": jsxA11y,
        },

        rules: {
            "@next/next/no-html-link-for-pages": "error",
            "@next/next/no-sync-scripts": "error",
            "@next/next/no-page-custom-font": "off",
            "@next/next/no-img-element": "off",
            "security/detect-object-injection": "off",

            "no-restricted-imports": ["error", {
                patterns: ["../components/apps/*", "./components/apps/*", "components/apps/*"],
            }],
        },
    }, {
        files: ["**/*.config.js", "scripts/**/*.js"],
        extends: compat.extends("plugin:node/recommended"),

        plugins: {
            node,
        },

        rules: {
            "node/no-deprecated-api": "off",
        },
    }, {
    files: ["**/apps.config.js"],

    rules: {
        "no-restricted-imports": "off",
    },
}]);
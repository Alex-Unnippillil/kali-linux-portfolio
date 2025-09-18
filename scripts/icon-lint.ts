#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import fg from "fast-glob";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

const DEFAULT_PATTERNS = ["components/icons/**/*.svg", "public/icons/**/*.svg"];
const GRID_SIZE = 0.5;
const GRID_EPSILON = 1e-3;
const TARGET_STROKE_WIDTH = 1.5;
const ALLOWED_STROKES = [TARGET_STROKE_WIDTH];
const ALLOWED_CORNER_RADII = [0, 2, 4];
const NUMBER_REGEX = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

type ParsedNode = Record<string, unknown>;

type Issue = {
  location: string;
  message: string;
  suggestion?: string;
  fixed?: boolean;
};

type FileLintResult = {
  issues: Issue[];
  fixedCount: number;
  mutatedSource: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  suppressBooleanAttributes: false,
});

function formatNumber(value: number): string {
  return Number.parseFloat(value.toFixed(3)).toString();
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function isOnGrid(value: number): boolean {
  return Math.abs(value - snapToGrid(value)) <= GRID_EPSILON;
}

function findNearest(values: number[], target: number): number {
  let best = values[0];
  let bestDistance = Math.abs(best - target);
  for (const value of values) {
    const distance = Math.abs(value - target);
    if (distance < bestDistance) {
      best = value;
      bestDistance = distance;
    }
  }
  return best;
}

function lintStrokeWidth(
  node: ParsedNode,
  location: string,
  issues: Issue[],
  applyFix: boolean
): number {
  let fixed = 0;
  for (const attr of ["@_stroke-width", "@_strokeWidth"]) {
    if (!(attr in node)) continue;
    const rawValue = node[attr];
    if (typeof rawValue !== "string" && typeof rawValue !== "number") {
      issues.push({
        location,
        message: `Stroke width attribute is not numeric (received ${String(rawValue)}).`,
      });
      continue;
    }
    const parsed = Number.parseFloat(String(rawValue));
    if (!Number.isFinite(parsed)) {
      issues.push({
        location,
        message: `Stroke width attribute is not numeric (received ${String(rawValue)}).`,
      });
      continue;
    }
    const snapped = findNearest(ALLOWED_STROKES, parsed);
    if (Math.abs(parsed - snapped) > GRID_EPSILON) {
      const suggestion = `Set stroke-width to ${formatNumber(snapped)}.`;
      if (applyFix) {
        node[attr] = formatNumber(snapped);
        issues.push({
          location,
          message: `Stroke width ${formatNumber(parsed)} adjusted to ${formatNumber(snapped)}.`,
          fixed: true,
        });
        fixed += 1;
      } else {
        issues.push({
          location,
          message: `Stroke width ${formatNumber(parsed)} does not match guidelines.`,
          suggestion,
        });
      }
    }
  }
  return fixed;
}

function lintCornerRadius(
  tagName: string,
  node: ParsedNode,
  location: string,
  issues: Issue[],
  applyFix: boolean
): number {
  if (tagName !== "rect") {
    return 0;
  }
  let fixed = 0;
  for (const attr of ["@_rx", "@_ry"]) {
    if (!(attr in node)) continue;
    const rawValue = node[attr];
    if (typeof rawValue !== "string" && typeof rawValue !== "number") {
      issues.push({
        location,
        message: `Corner radius attribute ${attr.replace("@_", "")} is not numeric (received ${String(rawValue)}).`,
      });
      continue;
    }
    const parsed = Number.parseFloat(String(rawValue));
    if (!Number.isFinite(parsed)) {
      issues.push({
        location,
        message: `Corner radius attribute ${attr.replace("@_", "")} is not numeric (received ${String(rawValue)}).`,
      });
      continue;
    }
    const snapped = findNearest(ALLOWED_CORNER_RADII, parsed);
    if (Math.abs(parsed - snapped) > GRID_EPSILON) {
      const suggestion = `Use a corner radius of ${formatNumber(snapped)}.`;
      if (applyFix) {
        node[attr] = formatNumber(snapped);
        issues.push({
          location,
          message: `Corner radius ${formatNumber(parsed)} adjusted to ${formatNumber(snapped)}.`,
          fixed: true,
        });
        fixed += 1;
      } else {
        issues.push({
          location,
          message: `Corner radius ${formatNumber(parsed)} violates the icon grid guidelines.`,
          suggestion,
        });
      }
    }
  }
  return fixed;
}

function lintNumericAttributes(
  node: ParsedNode,
  location: string,
  issues: Issue[],
  applyFix: boolean
): number {
  const attributesToCheck = [
    "@_x",
    "@_y",
    "@_cx",
    "@_cy",
    "@_x1",
    "@_y1",
    "@_x2",
    "@_y2",
    "@_width",
    "@_height",
    "@_r",
    "@_rx",
    "@_ry",
  ];
  let fixed = 0;
  for (const attr of attributesToCheck) {
    if (!(attr in node)) continue;
    const rawValue = node[attr];
    if (typeof rawValue !== "string" && typeof rawValue !== "number") continue;
    const parsed = Number.parseFloat(String(rawValue));
    if (!Number.isFinite(parsed)) continue;
    if (!isOnGrid(parsed)) {
      const snapped = snapToGrid(parsed);
      const suggestion = `Snap ${attr.replace("@_", "")} from ${formatNumber(parsed)} to ${formatNumber(snapped)}.`;
      if (applyFix) {
        node[attr] = formatNumber(snapped);
        issues.push({
          location,
          message: `${attr.replace("@_", "")} snapped to ${formatNumber(snapped)} (was ${formatNumber(parsed)}).`,
          fixed: true,
        });
        fixed += 1;
      } else {
        issues.push({
          location,
          message: `${attr.replace("@_", "")} is off grid (${formatNumber(parsed)}).`,
          suggestion,
        });
      }
    }
  }
  return fixed;
}

function lintNumericStringAttribute(
  node: ParsedNode,
  attributeName: string,
  location: string,
  issues: Issue[],
  applyFix: boolean
): number {
  if (!(attributeName in node)) return 0;
  const rawValue = node[attributeName];
  if (typeof rawValue !== "string") return 0;
  const replacements: Array<{ from: number; to: number }> = [];
  let mutatedValue = rawValue.replace(NUMBER_REGEX, (match) => {
    const parsed = Number.parseFloat(match);
    if (!Number.isFinite(parsed)) {
      return match;
    }
    if (isOnGrid(parsed)) {
      return match;
    }
    const snapped = snapToGrid(parsed);
    replacements.push({ from: parsed, to: snapped });
    return applyFix ? formatNumber(snapped) : match;
  });

  if (replacements.length === 0) {
    return 0;
  }

  if (applyFix) {
    node[attributeName] = mutatedValue;
    issues.push({
      location,
      message: `${attributeName.replace("@_", "")} values snapped to the grid (${replacements
        .map((entry) => `${formatNumber(entry.from)}→${formatNumber(entry.to)}`)
        .join(", ")}).`,
      fixed: true,
    });
    return replacements.length;
  }

  issues.push({
    location,
    message: `${attributeName.replace("@_", "")} contains off-grid values (${replacements
      .map((entry) => formatNumber(entry.from))
      .join(", ")}).`,
    suggestion: `Snap values to the ${formatNumber(GRID_SIZE)} grid (e.g. ${replacements
      .map((entry) => `${formatNumber(entry.from)}→${formatNumber(entry.to)}`)
      .join(", ")}).`,
  });
  return 0;
}

function walk(
  tagName: string,
  node: ParsedNode,
  ancestors: string[],
  issues: Issue[],
  applyFix: boolean
): number {
  let fixedCount = 0;
  const location = [...ancestors, tagName].filter(Boolean).join(" > ");
  fixedCount += lintStrokeWidth(node, location, issues, applyFix);
  fixedCount += lintCornerRadius(tagName, node, location, issues, applyFix);
  fixedCount += lintNumericAttributes(node, location, issues, applyFix);
  fixedCount += lintNumericStringAttribute(node, "@_points", location, issues, applyFix);
  fixedCount += lintNumericStringAttribute(node, "@_d", location, issues, applyFix);

  for (const [key, value] of Object.entries(node)) {
    if (!key || key.startsWith("@_")) continue;
    if (key === "#text") continue;
    if (Array.isArray(value)) {
      value.forEach((child, index) => {
        if (child && typeof child === "object") {
          fixedCount += walk(`${key}[${index}]`, child as ParsedNode, [...ancestors, tagName], issues, applyFix);
        }
      });
    } else if (value && typeof value === "object") {
      fixedCount += walk(key, value as ParsedNode, [...ancestors, tagName], issues, applyFix);
    }
  }

  return fixedCount;
}

async function lintFile(filePath: string, applyFix: boolean): Promise<FileLintResult> {
  const raw = await fs.readFile(filePath, "utf8");
  let parsed: ParsedNode;
  try {
    parsed = parser.parse(raw);
  } catch (error) {
    return {
      issues: [
        {
          location: path.relative(process.cwd(), filePath),
          message: `Unable to parse SVG: ${(error as Error).message}`,
        },
      ],
      fixedCount: 0,
      mutatedSource: null,
    };
  }

  const issues: Issue[] = [];
  let fixedCount = 0;

  for (const [key, value] of Object.entries(parsed)) {
    if (value && typeof value === "object") {
      fixedCount += walk(key, value as ParsedNode, [], issues, applyFix);
    }
  }

  let mutatedSource: string | null = null;
  if (applyFix && fixedCount > 0) {
    mutatedSource = builder.build(parsed);
    if (!mutatedSource.endsWith("\n")) {
      mutatedSource += "\n";
    }
  }

  return { issues, fixedCount, mutatedSource };
}

async function main() {
  const args = process.argv.slice(2);
  const applyFix = args.includes("--fix");
  const patterns = args.filter((arg) => !arg.startsWith("--"));
  const searchPatterns = patterns.length > 0 ? patterns : DEFAULT_PATTERNS;
  const files = await fg(searchPatterns, {
    onlyFiles: true,
    unique: true,
    ignore: ["**/node_modules/**"],
  });

  if (files.length === 0) {
    console.log(`No SVG files matched patterns: ${searchPatterns.join(", ")}`);
    return;
  }

  let totalIssues = 0;
  let outstandingIssues = 0;

  for (const file of files) {
    const { issues, fixedCount, mutatedSource } = await lintFile(file, applyFix);
    if (mutatedSource) {
      await fs.writeFile(file, mutatedSource, "utf8");
    }
    if (issues.length === 0) {
      continue;
    }
    const relativePath = path.relative(process.cwd(), file);
    console.log(`\n${relativePath}`);
    for (const issue of issues) {
      const details = ["  -", issue.message];
      if (issue.suggestion) {
        details.push(`Suggestion: ${issue.suggestion}`);
      }
      if (issue.fixed) {
        details.push("[fixed]");
      }
      console.log(details.join(" "));
      if (!issue.fixed) {
        outstandingIssues += 1;
      }
    }
    totalIssues += issues.length;
    if (applyFix && fixedCount > 0) {
      console.log(`  Applied ${fixedCount} fix${fixedCount === 1 ? "" : "es"}.`);
    }
  }

  if (totalIssues === 0) {
    console.log("All SVG icons comply with the guidelines.");
  }

  if (outstandingIssues > 0) {
    console.error(`\nIcon lint failed with ${outstandingIssues} outstanding issue${outstandingIssues === 1 ? "" : "s"}.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

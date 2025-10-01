"use client";

import React, { useEffect } from "react";

export type ColorSimulatorMode = "deutan" | "protan" | "tritan";

const FILTER_MATRICES: Record<ColorSimulatorMode, readonly number[]> = {
  deutan: [
    0.625, 0.7, -0.325, 0, 0,
    0.7, 0.3, 0, 0, 0,
    0, 0.3, 0.7, 0, 0,
    0, 0, 0, 1, 0,
  ],
  protan: [
    0.2, 0.7, 0.1, 0, 0,
    0.2, 0.7, 0.1, 0, 0,
    0, 0.3, 0.7, 0, 0,
    0, 0, 0, 1, 0,
  ],
  tritan: [
    0.95, 0.05, 0, 0, 0,
    0, 0.433, 0.567, 0, 0,
    0, 0.475, 0.525, 0, 0,
    0, 0, 0, 1, 0,
  ],
};

export interface ColorSimulatorProps {
  active: boolean;
  mode: ColorSimulatorMode;
  children: React.ReactNode;
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function ensureSvgDefs(): SVGSVGElement | null {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById("dev-color-simulator-defs");
  if (existing && existing instanceof SVGSVGElement) {
    return existing;
  }
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("id", "dev-color-simulator-defs");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.style.pointerEvents = "none";
  const defs = document.createElementNS(SVG_NAMESPACE, "defs");
  svg.append(defs);
  document.body.appendChild(svg);
  return svg;
}

function syncFilters() {
  const svg = ensureSvgDefs();
  if (!svg) return;
  const defs = svg.querySelector("defs");
  if (!defs) return;
  Object.entries(FILTER_MATRICES).forEach(([key, matrix]) => {
    const filterId = `color-sim-${key}`;
    let filter = defs.querySelector(`#${filterId}`) as SVGFilterElement | null;
    if (!filter) {
      filter = document.createElementNS(SVG_NAMESPACE, "filter");
      filter.setAttribute("id", filterId);
      filter.setAttribute("color-interpolation-filters", "sRGB");
      const feColorMatrix = document.createElementNS(
        SVG_NAMESPACE,
        "feColorMatrix",
      );
      feColorMatrix.setAttribute("type", "matrix");
      feColorMatrix.setAttribute("values", matrix.join(" "));
      filter.appendChild(feColorMatrix);
      defs.appendChild(filter);
    } else {
      const fe = filter.querySelector("feColorMatrix");
      if (fe) {
        fe.setAttribute("values", matrix.join(" "));
      }
    }
  });
}

const ColorSimulator: React.FC<ColorSimulatorProps> = ({
  active,
  mode,
  children,
}) => {
  useEffect(() => {
    syncFilters();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const target = document.documentElement;
    const previousFilter = target.style.filter;
    const frame = requestAnimationFrame(() => {
      target.style.filter = active ? `url(#color-sim-${mode})` : "";
    });
    return () => {
      cancelAnimationFrame(frame);
      requestAnimationFrame(() => {
        target.style.filter = previousFilter;
      });
    };
  }, [active, mode]);

  return <>{children}</>;
};

export default ColorSimulator;

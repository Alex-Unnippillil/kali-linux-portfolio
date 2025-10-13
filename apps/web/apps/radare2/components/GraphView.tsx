"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

interface Block {
  addr: string;
  edges?: string[];
}

interface GraphViewProps {
  blocks: Block[];
  theme: string;
}

const ForceGraph2D = dynamic(
  () => import("react-force-graph").then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

const GraphView: React.FC<GraphViewProps> = ({ blocks, theme }) => {
  const fgRef = useRef<any | null>(null);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<Block | null>(null);
  const [colors, setColors] = useState({
    bg: "#000",
    surface: "#374151",
    text: "#fff",
    accent: "#fbbf24",
    border: "#4b5563",
  });

  const graphData = useMemo(() => {
    const nodes = blocks.map((b) => ({ id: b.addr }));
    const links: { source: string; target: string }[] = [];
    blocks.forEach((b) =>
      (b.edges || []).forEach((e) => links.push({ source: b.addr, target: e })),
    );
    return { nodes, links };
  }, [blocks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const style = getComputedStyle(document.documentElement);
    setColors({
      bg: style.getPropertyValue("--r2-bg").trim() || "#000",
      surface: style.getPropertyValue("--r2-surface").trim() || "#374151",
      text: style.getPropertyValue("--r2-text").trim() || "#fff",
      accent: style.getPropertyValue("--r2-accent").trim() || "#fbbf24",
      border: style.getPropertyValue("--r2-border").trim() || "#4b5563",
    });
  }, [theme]);

  useEffect(() => {
    const fg = fgRef.current;
    if (fg) {
      fg.zoomToFit(400, 20);
      const bbox = fg.getGraphBbox();
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      setCenter({ x: cx, y: cy });
    }
  }, [graphData]);

  const zoomIn = () => {
    const fg = fgRef.current;
    if (!fg) return;
    const current = fg.zoom();
    fg.zoom(current * 1.2, 200);
  };

  const zoomOut = () => {
    const fg = fgRef.current;
    if (!fg) return;
    const current = fg.zoom();
    fg.zoom(current / 1.2, 200);
  };

  const pan = (dx: number, dy: number) => {
    const fg = fgRef.current;
    if (!fg) return;
    setCenter((c) => {
      const nx = c.x + dx;
      const ny = c.y + dy;
      fg.centerAt(nx, ny, 200);
      return { x: nx, y: ny };
    });
  };

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const nodeCanvasObject = (
    node: any,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    const label = node.id;
    const fontSize = 12 / globalScale;
    const isSelected = selected && selected.addr === node.id;
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    const width = textWidth + 8;
    const height = fontSize + 6;
    const x = node.x - width / 2;
    const y = node.y - height / 2;
    ctx.fillStyle = isSelected ? colors.accent : colors.surface;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isSelected ? "#000" : colors.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, node.x, node.y);
  };

  const nodePointerAreaPaint = (
    node: any,
    color: string,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    const label = node.id;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    const width = textWidth + 8;
    const height = fontSize + 6;
    const x = node.x - width / 2;
    const y = node.y - height / 2;
    roundRect(ctx, x, y, width, height, 6);
    ctx.fillStyle = color;
    ctx.fill();
  };

  const handleNodeClick = (node: any) => {
    const block = blocks.find((b) => b.addr === node.id) || null;
    setSelected(block);
  };

  const linkColor = (link: any) => {
    if (
      selected &&
      typeof link.source !== "string" &&
      link.source.id === selected.addr
    ) {
      return colors.accent;
    }
    return colors.border;
  };

  const linkWidth = (link: any) => {
    if (
      selected &&
      typeof link.source !== "string" &&
      link.source.id === selected.addr
    ) {
      return 2;
    }
    return 1;
  };

  return (
    <div className="h-full w-full">
      <div className="flex gap-2 mb-2 flex-wrap">
        <button
          onClick={zoomIn}
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          -
        </button>
        <button
          onClick={() => pan(0, -20)}
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          ↑
        </button>
        <button
          onClick={() => pan(0, 20)}
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          ↓
        </button>
        <button
          onClick={() => pan(-20, 0)}
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          ←
        </button>
        <button
          onClick={() => pan(20, 0)}
          className="px-2 py-1 rounded"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          →
        </button>
      </div>
      <div
        className="h-64 rounded"
        style={{ backgroundColor: "var(--r2-surface)" }}
      >
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          backgroundColor={colors.surface}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={linkColor}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={nodePointerAreaPaint}
          onNodeClick={handleNodeClick}
        />
      </div>
      {selected && (
        <div
          className="mt-2 p-2 rounded text-sm"
          style={{
            backgroundColor: "var(--r2-surface)",
            border: "1px solid var(--r2-border)",
          }}
        >
          <div>Block: {selected.addr}</div>
          <div>Outgoing edges: {selected.edges?.join(", ") || "None"}</div>
        </div>
      )}
    </div>
  );
};

export default GraphView;

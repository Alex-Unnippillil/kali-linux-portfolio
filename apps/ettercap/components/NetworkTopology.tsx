'use client';

import React, { useMemo, useState } from 'react';

type NodeRole = 'client' | 'attacker' | 'service' | 'infrastructure';

type TopologyNode = {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  role: NodeRole;
};

type TopologyLink = {
  id: string;
  source: string;
  target: string;
  label: string;
  emphasis?: 'normal' | 'alert';
};

type FlowDescriptor = {
  id: string;
  title: string;
  description: string;
  impact: string;
};

interface NetworkTopologyProps {
  nodes: TopologyNode[];
  links: TopologyLink[];
  flows: FlowDescriptor[];
  scenarioLabel: string;
  mode: string;
  started: boolean;
}

const ROLE_STYLE: Record<NodeRole, { dot: string; badge: string; text: string }> = {
  client: {
    dot: 'from-sky-500 via-sky-400 to-sky-600',
    badge:
      'border-[color:color-mix(in_srgb,var(--color-primary)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_15%,var(--kali-panel))]',
    text: 'text-[color:color-mix(in_srgb,var(--color-primary)_88%,var(--kali-text))]',
  },
  attacker: {
    dot: 'from-rose-500 via-rose-400 to-rose-600',
    badge:
      'border-[color:color-mix(in_srgb,var(--color-danger)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_15%,var(--kali-panel))]',
    text: 'text-[color:color-mix(in_srgb,var(--color-danger)_85%,var(--kali-text))]',
  },
  service: {
    dot: 'from-emerald-500 via-emerald-400 to-emerald-600',
    badge:
      'border-[color:color-mix(in_srgb,var(--color-success)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-success)_12%,var(--kali-panel))]',
    text: 'text-[color:color-mix(in_srgb,var(--color-success)_80%,var(--kali-text))]',
  },
  infrastructure: {
    dot: 'from-amber-500 via-amber-400 to-amber-600',
    badge:
      'border-[color:color-mix(in_srgb,var(--color-warning)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning)_12%,var(--kali-panel))]',
    text: 'text-[color:color-mix(in_srgb,var(--color-warning)_80%,var(--kali-text))]',
  },
};

const VIEWBOX_WIDTH = 420;
const VIEWBOX_HEIGHT = 280;

function toPercent(value: number, max: number) {
  return `${(value / max) * 100}%`;
}

export default function NetworkTopology({
  nodes,
  links,
  flows,
  scenarioLabel,
  mode,
  started,
}: NetworkTopologyProps) {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes]);

  const focusNode = activeNode ? nodeMap[activeNode] : null;

  return (
    <section aria-labelledby="ettercap-topology-heading" className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="ettercap-topology-heading"
            className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))]"
          >
            Network topology — {scenarioLabel}
          </h2>
          <p className="text-xs text-[color:color-mix(in_srgb,var(--color-primary)_55%,var(--kali-text))]">
            Animated flows highlight the MITM route in {mode.toLowerCase()} mode.
          </p>
        </div>
        <span className="rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--kali-panel))] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))]">
          {started ? 'Live demo path' : 'Preview path'}
        </span>
      </header>

      <div className="relative overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_8%,var(--kali-panel))] p-4">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="h-72 w-full text-[color:var(--kali-text)]"
          role="img"
          aria-labelledby="ettercap-topology-heading"
        >
          <title id="ettercap-topology-heading">Network topology diagram for the Ettercap lab scenario</title>
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(59,130,246,0.4)" />
              <stop offset="50%" stopColor="rgba(236,72,153,0.8)" />
              <stop offset="100%" stopColor="rgba(248,113,113,0.4)" />
            </linearGradient>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(236,72,153,0.75)" />
            </marker>
          </defs>

          {links.map((link) => (
            <g key={link.id}>
              <path
                d={`M ${nodeMap[link.source].x} ${nodeMap[link.source].y} C ${(nodeMap[link.source].x + nodeMap[link.target].x) / 2} ${nodeMap[link.source].y - 20} ${(nodeMap[link.source].x + nodeMap[link.target].x) / 2} ${nodeMap[link.target].y + 20} ${nodeMap[link.target].x} ${nodeMap[link.target].y}`}
                stroke="url(#flowGradient)"
                strokeWidth={link.emphasis === 'alert' ? 3.5 : 2.5}
                strokeDasharray="6 10"
                strokeDashoffset={24}
                className={started ? 'motion-safe:animate-[flow_5s_linear_infinite]' : ''}
                markerEnd="url(#arrow)"
                fill="none"
                aria-hidden
              />
              <text
                className="text-[10px] font-medium"
                x={(nodeMap[link.source].x + nodeMap[link.target].x) / 2}
                y={(nodeMap[link.source].y + nodeMap[link.target].y) / 2 - 6}
                textAnchor="middle"
                fill="rgba(226,232,240,0.75)"
              >
                {link.label}
              </text>
            </g>
          ))}

          {nodes.map((node) => {
            const palette = ROLE_STYLE[node.role];
            return (
              <foreignObject key={node.id} x={node.x - 32} y={node.y - 32} width="96" height="96">
                <button
                  type="button"
                  onMouseEnter={() => setActiveNode(node.id)}
                  onFocus={() => setActiveNode(node.id)}
                  onMouseLeave={() => setActiveNode((current) => (current === node.id ? null : current))}
                  onBlur={() => setActiveNode((current) => (current === node.id ? null : current))}
                  className={`group flex h-16 w-16 flex-col items-center justify-center rounded-full border text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)] ${palette.badge}`}
                  aria-describedby={`${node.id}-description`}
                >
                  <span
                    className={`pointer-events-none inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-[color:var(--kali-text)] shadow-[0_0_10px_rgba(59,130,246,0.25)] transition group-hover:scale-110 group-focus-visible:scale-110 ${palette.dot}`}
                  >
                    {node.label.split(' ').map((part) => part[0]).join('')}
                  </span>
                  <span className={`mt-1 text-[10px] ${palette.text}`}>{node.label}</span>
                  <span id={`${node.id}-description`} className="sr-only">
                    {node.description}
                  </span>
                </button>
              </foreignObject>
            );
          })}
        </svg>

        {focusNode && (
          <div
            className="pointer-events-none absolute rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_18%,var(--kali-bg))] p-3 text-xs text-[color:var(--kali-text)] shadow-lg"
            style={{
              left: `calc(${toPercent(focusNode.x, VIEWBOX_WIDTH)} - 6rem)`,
              top: `calc(${toPercent(focusNode.y, VIEWBOX_HEIGHT)} - 7rem)`,
            }}
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold text-[color:color-mix(in_srgb,var(--color-primary)_85%,var(--kali-text))]">
              {focusNode.label}
            </p>
            <p className="mt-1 leading-relaxed text-[color:color-mix(in_srgb,var(--color-primary)_55%,var(--kali-text))]">
              {focusNode.description}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3" aria-live="polite">
        {flows.map((flow, index) => (
          <article
            key={flow.id}
            className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_5%,var(--kali-panel))] p-3 text-xs text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]"
          >
            <header className="flex items-start justify-between gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_25%,var(--kali-panel))] text-[11px] font-semibold text-[color:var(--kali-text)]">
                {index + 1}
              </span>
              <p className="flex-1 text-[color:var(--kali-text)]">{flow.title}</p>
            </header>
            <p className="mt-2 leading-relaxed">{flow.description}</p>
            <p className="mt-2 rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--kali-bg))] px-2 py-1 text-[10px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))]">
              Impact: {flow.impact}
            </p>
          </article>
        ))}
      </div>
      <style jsx global>{`
        @keyframes flow {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: -24;
          }
        }
      `}</style>
    </section>
  );
}


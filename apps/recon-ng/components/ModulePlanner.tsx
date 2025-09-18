'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import usePersistentState from '../../../hooks/usePersistentState';
import { getPackage, packageNames } from '../packageMetadata';
import {
  describeConflict,
  evaluateToggle,
  getHeldPackages,
} from '../packagePlanner';

const WORKSPACES = ['default', 'testing', 'production'];

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false },
);

const ModulePlanner: React.FC = () => {
  const [plan, setPlan] = usePersistentState<string[]>('reconng-plan', []);
  const [workspace, setWorkspace] = usePersistentState<string>(
    'reconng-workspace',
    WORKSPACES[0],
  );
  const [log, setLog] = useState('');

  const heldWarnings = useMemo(() => getHeldPackages(plan), [plan]);

  const toggle = (name: string) => {
    setPlan((currentPlan) => {
      const evaluation = evaluateToggle(currentPlan, name);
      if (evaluation.conflicts.length > 0 && evaluation.isRemoval) {
        const message = `${evaluation.conflicts
          .map((conflict) => describeConflict(conflict))
          .join('\n')}\n\nProceed with removal?`;
        const proceed =
          typeof window === 'undefined' ? true : window.confirm(message);
        if (!proceed) {
          return currentPlan;
        }
      }
      return evaluation.nextPlan;
    });
  };

  const exportPlan = () => {
    const lines = [
      `Workspace: ${workspace}`,
      'Modules:',
      ...plan.map((m) => `- ${m}`),
    ];
    if (heldWarnings.length > 0) {
      lines.push('Warnings:');
      heldWarnings.forEach((warning) =>
        lines.push(`! ${warning.name}: ${warning.reason}`),
      );
    }
    setLog(lines.join('\n'));
  };

  const graphData = useMemo(() => {
    const nodes = new Set<string>();
    const links: { source: string; target: string }[] = [];

    const visit = (m: string) => {
      if (nodes.has(m)) return;
      nodes.add(m);
      getPackage(m)?.deps.forEach((d) => {
        visit(d);
        links.push({ source: d, target: m });
      });
    };

    plan.forEach(visit);

    return {
      nodes: Array.from(nodes).map((id) => ({ id })),
      links,
    };
  }, [plan]);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 text-white h-full">
      <div className="flex items-center gap-2">
        <label htmlFor="workspace">Workspace:</label>
        <select
          id="workspace"
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
          className="text-black p-1 rounded"
        >
          {WORKSPACES.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>
      {heldWarnings.length > 0 && (
        <div
          role="alert"
          className="rounded border border-yellow-500 bg-yellow-900/40 p-3 text-xs text-yellow-100"
        >
          <h2 className="font-semibold text-yellow-200">Held packages</h2>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            {heldWarnings.map((warning) => (
              <li key={warning.name}>
                <span className="font-semibold">{warning.name}</span>: {' '}
                {warning.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {packageNames.map((m) => {
          const pkg = getPackage(m);
          if (!pkg) return null;
          const active = plan.includes(m);
          return (
            <div
              key={m}
              className={`border rounded p-2 cursor-pointer ${
                active
                  ? 'bg-blue-900 border-blue-500'
                  : 'bg-gray-800 border-gray-700'
              }`}
              onClick={() => toggle(m)}
            >
              <div className="font-bold">{m}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {pkg.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-gray-700 px-1 rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
              {(pkg.pinned || pkg.held) && (
                <div className="mt-2 space-y-1 text-xs">
                  {pkg.pinned && (
                    <p className="flex items-center gap-1 text-sky-200">
                      <span aria-hidden="true" role="img">
                        📌
                      </span>
                      <span>
                        Pinned: {pkg.pinned.reason}
                      </span>
                    </p>
                  )}
                  {pkg.held && (
                    <p className="flex items-center gap-1 text-yellow-200">
                      <span aria-hidden="true" role="img">
                        ⚠️
                      </span>
                      <span>Held: {pkg.held.reason}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {graphData.nodes.length > 0 && (
        <div className="h-64 bg-black rounded">
          <ForceGraph2D
            graphData={graphData}
            nodeCanvasObject={(node: any, ctx) => {
              ctx.fillStyle = 'lightblue';
              ctx.beginPath();
              ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
              ctx.fill();
              ctx.font = '10px sans-serif';
              ctx.fillText(node.id, node.x + 6, node.y + 3);
            }}
          />
        </div>
      )}
      <div>
        <button
          type="button"
          onClick={exportPlan}
          className="px-2 py-1 bg-blue-700 rounded"
        >
          Export Plan
        </button>
        {log && (
          <pre className="mt-2 bg-black text-green-400 p-2 rounded font-mono whitespace-pre-wrap">
            {log}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ModulePlanner;


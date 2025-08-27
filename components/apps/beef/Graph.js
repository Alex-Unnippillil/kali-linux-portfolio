import React, { useRef, useEffect } from 'react';
import cytoscape from 'cytoscape';

export default function BeefGraph({ hooks, steps }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const liveRef = useRef(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!containerRef.current || containerRef.current.offsetHeight === 0) return;
    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: containerRef.current,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#ffffff',
              label: 'data(label)',
              color: '#000000',
              'text-outline-color': '#ffffff',
              'text-outline-width': 1,
              'font-size': 10,
            },
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': '#00ff00',
              'target-arrow-color': '#00ff00',
              'target-arrow-shape': 'triangle',
            },
          },
        ],
        layout: { name: 'grid', animate: false },
      });
    }
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.elements().remove();
      hooks.forEach((hook) => {
        const id = hook.session || hook.id;
        cy.add({ data: { id, label: hook.name || id } });
      });
      steps.forEach((step, idx) => {
        const moduleNodeId = `${step.module}-${idx}`;
        cy.add({ data: { id: moduleNodeId, label: step.module } });
        cy.add({
          data: {
            id: `${step.hook}-${moduleNodeId}`,
            source: step.hook,
            target: moduleNodeId,
          },
        });
      });
    });

    window.requestAnimationFrame(() => {
      cy.layout({ name: 'cose', animate: !prefersReducedMotion }).run();
    });

    if (liveRef.current) {
      liveRef.current.textContent = `Graph updated with ${hooks.length} hooks and ${steps.length} steps`;
    }
  }, [hooks, steps, prefersReducedMotion]);

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-64 bg-black"
        role="img"
        aria-label="Hooks and attack steps graph"
      />
      <div ref={liveRef} className="sr-only" aria-live="polite" />
    </>
  );
}

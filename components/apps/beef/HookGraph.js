import React, { useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

export default function HookGraph({ hooks, steps }) {
  const cyRef = useRef(null);
  const workerRef = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(
      URL.createObjectURL(
        new Blob(
          [
            `self.onmessage = (e) => {\n` +
              `  const { hooks, steps } = e.data;\n` +
              `  const elements = [];\n` +
              `  hooks.forEach((h) => {\n` +
              `    elements.push({ data: { id: h.id, label: h.label, type: 'hook' } });\n` +
              `  });\n` +
              `  steps.forEach((s) => {\n` +
              `    const moduleNode = 'module-' + s.id;\n` +
              `    elements.push({ data: { id: moduleNode, label: s.module, type: 'module' } });\n` +
              `    elements.push({ data: { id: 'edge-' + s.id, source: s.hook, target: moduleNode } });\n` +
              `  });\n` +
              `  self.postMessage(elements);\n` +
              `};`
          ],
          { type: 'application/javascript' }
        )
      )
    );
    return () => workerRef.current && workerRef.current.terminate();
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    const formattedHooks = hooks.map((h) => ({
      id: h.session || h.id,
      label: h.name || h.session || h.id,
    }));
    workerRef.current.onmessage = (e) => {
      const elements = e.data;
      if (!cyRef.current) return;
      const cy = cyRef.current;
      cy.batch(() => {
        cy.elements().remove();
        cy.add(elements);
      });
      requestAnimationFrame(() => {
        cy.layout({
          name: 'cose-bilkent',
          animate: !reduceMotion,
          randomize: true,
        }).run();
      });
    };
    workerRef.current.postMessage({ hooks: formattedHooks, steps });
  }, [hooks, steps, reduceMotion]);

  const stylesheet = [
    {
      selector: 'node[type="hook"]',
      style: {
        'background-color': '#1a73e8',
        color: '#fff',
        'text-outline-width': 1,
        'text-outline-color': '#000',
        label: 'data(label)',
      },
    },
    {
      selector: 'node[type="module"]',
      style: {
        'background-color': '#e37400',
        color: '#fff',
        'text-outline-width': 1,
        'text-outline-color': '#000',
        label: 'data(label)',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
      },
    },
  ];

  return (
    <CytoscapeComponent
      cy={(cy) => {
        cyRef.current = cy;
      }}
      elements={[]}
      style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
      stylesheet={stylesheet}
      wheelSensitivity={0.1}
    />
  );
}

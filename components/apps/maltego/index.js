import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const defaultGraph = {
  nodes: [
    { id: 'Entity1' },
    { id: 'Entity2' },
  ],
  links: [{ source: 'Entity1', target: 'Entity2' }],
};

const Maltego = ({ addFolder, openApp }) => {
  const [nodes, setNodes] = useState(defaultGraph.nodes);
  const [links, setLinks] = useState(defaultGraph.links);
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-width', 1.5);

    const node = svg
      .append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', 10)
      .attr('fill', '#69b3a2')
      .call(
        d3
          .drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    const label = svg
      .append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d) => d.id)
      .style('fill', '#fff')
      .style('font-size', '12px')
      .attr('x', 12)
      .attr('y', 3);

    node.append('title').text((d) => d.id);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);

      label.attr('x', (d) => d.x).attr('y', (d) => d.y);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => simulation.stop();
  }, [nodes, links]);

  const addNode = () => {
    const id = prompt('Enter entity name');
    if (!id) return;
    if (nodes.find((n) => n.id === id)) {
      alert('Entity already exists');
      return;
    }
    setNodes([...nodes, { id }]);
  };

  const addLink = () => {
    const source = prompt('Source entity');
    const target = prompt('Target entity');
    if (!source || !target) return;
    if (!nodes.find((n) => n.id === source) || !nodes.find((n) => n.id === target)) {
      alert('Both entities must exist');
      return;
    }
    setLinks([...links, { source, target }]);
  };

  const exportGraph = () => {
    const dataStr = JSON.stringify({ nodes, links }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maltego-graph.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importGraph = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        setNodes(json.nodes || []);
        setLinks(json.links || []);
      } catch (err) {
        alert('Invalid graph file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white">
      <div className="p-2 flex gap-2 bg-gray-900">
        <button className="px-2 py-1 bg-blue-600 rounded" onClick={addNode}>
          Add Entity
        </button>
        <button className="px-2 py-1 bg-blue-600 rounded" onClick={addLink}>
          Add Link
        </button>
        <button className="px-2 py-1 bg-blue-600 rounded" onClick={exportGraph}>
          Export
        </button>
        <label className="px-2 py-1 bg-blue-600 rounded cursor-pointer">
          Import
          <input type="file" accept="application/json" className="hidden" onChange={importGraph} />
        </label>
      </div>
      <svg ref={svgRef} className="flex-1 w-full"></svg>
    </div>
  );
};

export default Maltego;


import React from 'react';
import milestones from '../data/milestones.json';

type Milestone = {
  year: string;
  description: string;
};

const ScrollableTimeline: React.FC = () => (
  <div className="overflow-x-auto" aria-labelledby="timeline-heading">
    <h3 id="timeline-heading" className="sr-only">
      Timeline
    </h3>
    <ol className="flex space-x-6">
      {(milestones as Milestone[]).map((m) => (
        <li key={m.year} className="flex-shrink-0 w-48">
          <div className="text-ubt-blue font-bold">{m.year}</div>
          <p className="text-sm">{m.description}</p>
        </li>
      ))}
    </ol>
  </div>
);

export default ScrollableTimeline;

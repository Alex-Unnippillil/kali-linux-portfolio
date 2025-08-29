import React from 'react';
import rawMilestones from '../data/milestones.json';

const milestones = rawMilestones as Record<string, string>;

const ScrollableTimeline: React.FC = () => (
  <div className="overflow-x-auto" aria-labelledby="timeline-heading">
    <h3 id="timeline-heading" className="sr-only">
      Timeline
    </h3>
    <ol className="flex space-x-6">
      {Object.entries(milestones).map(([year, description]) => (
        <li key={year} className="flex-shrink-0 w-48">
          <div className="text-ubt-blue font-bold">{year}</div>
          <p className="text-sm">{description}</p>
        </li>
      ))}
    </ol>
  </div>
);

export default ScrollableTimeline;

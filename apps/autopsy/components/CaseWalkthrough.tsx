'use client';

import React from 'react';
import caseData from '../data/case.json';
import Timeline, { TimelineEntry } from './Timeline';

interface FileNode {
  name: string;
  thumbnail?: string;
  children?: FileNode[];
}

const renderNode = (node: FileNode): React.ReactNode => {
  if (node.children && node.children.length > 0) {
    return (
      <div key={node.name} className="ml-4">
        <div className="flex items-center font-semibold">
          {node.thumbnail && (
            <img src={node.thumbnail} alt="" className="w-4 h-4 mr-1" />
          )}
          {node.name}
        </div>
        <div className="ml-4">
          {node.children.map((child) => (
            <div key={child.name}>{renderNode(child)}</div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div key={node.name} className="ml-4 flex items-center">
      {node.thumbnail && (
        <img src={node.thumbnail} alt="" className="w-4 h-4 mr-1" />
      )}
      {node.name}
    </div>
  );
};

const CaseWalkthrough: React.FC = () => {
  const { timeline, fileTree } = caseData as {
    timeline: TimelineEntry[];
    fileTree: FileNode;
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-bold mb-2">Timeline</h2>
        <Timeline events={timeline} />
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">File Tree</h2>
        {renderNode(fileTree)}
      </section>
    </div>
  );
};

export default CaseWalkthrough;


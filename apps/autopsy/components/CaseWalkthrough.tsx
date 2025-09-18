'use client';

import React, { useMemo } from 'react';
import caseData from '../data/case.json';
import type { CaseData, CaseFileNode } from '../types';

const renderNode = (node: CaseFileNode): React.ReactNode => {
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
  const { timeline, fileTree } = caseData as CaseData;
  const categories = useMemo(
    () =>
      new Map(
        timeline.categories.map((category) => [category.id, category])
      ),
    [timeline.categories]
  );

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-bold mb-2">Timeline</h2>
        <ul className="space-y-3">
          {timeline.events.map((item) => {
            const category = categories.get(item.categoryId);
            return (
              <li key={item.id} className="flex text-sm">
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-8 h-8 mr-2 rounded"
                  />
                )}
                <div>
                  <div className="font-semibold capitalize">{item.title}</div>
                  <div className="text-xs text-ubt-muted">
                    {new Date(item.timestamp).toLocaleString()}
                    {item.endTimestamp && (
                      <>
                        {' '}
                        –
                        {' '}
                        {new Date(item.endTimestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </>
                    )}
                    {category && (
                      <>
                        {' '}
                        · {category.label}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-ubt-muted">{item.summary}</div>
                  {item.sources && item.sources.length > 0 && (
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-ub-orange">
                      Sources: {item.sources.join(', ')}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">File Tree</h2>
        {renderNode(fileTree)}
      </section>
    </div>
  );
};

export default CaseWalkthrough;


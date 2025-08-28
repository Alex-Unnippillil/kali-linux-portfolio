import React from 'react';

const FeedStatusCard = () => {
  const feed = {
    source: 'Greenbone Community Feed',
    vtCount: 99564,
    lastUpdate: '2024-02-01',
    docs: 'https://docs.greenbone.net/'
  };
  return (
    <div className="p-4 bg-gray-800 rounded mb-4">
      <h3 className="text-md font-bold mb-2">VT Feed Status</h3>
      <p className="text-sm">Source: {feed.source}</p>
      <p className="text-sm">VTs: {feed.vtCount.toLocaleString()}</p>
      <p className="text-sm">Last Update: {feed.lastUpdate}</p>
      <p className="text-xs text-gray-400 mt-2">
        Data based on <a href={feed.docs} className="underline" target="_blank" rel="noreferrer">Greenbone docs</a> (canned demo)
      </p>
    </div>
  );
};

export default FeedStatusCard;

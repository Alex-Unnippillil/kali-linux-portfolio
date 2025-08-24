import React, { useState } from 'react';

interface Badge {
  src: string;
  alt: string;
  label: string;
  description?: string;
}

interface BadgeListProps {
  badges: Badge[];
  className?: string;
}

const BadgeList: React.FC<BadgeListProps> = ({ badges, className = '' }) => {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Badge | null>(null);

  const filteredBadges = badges.filter((badge: Badge) =>
    badge.label.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <input
        type="text"
        placeholder="Filter skills"
        className="mb-2 px-2 py-1 rounded text-black font-normal"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="flex flex-wrap justify-center items-start w-full">
        {filteredBadges.map((badge, idx) => (
          <img
            key={idx}
            className="m-1 hover:scale-110 transition-transform cursor-pointer"
            src={badge.src}
            alt={badge.alt}
            title={badge.description || badge.label}
            onClick={() => setSelected(badge)}
          />
        ))}
      </div>
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white text-black p-4 rounded shadow max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold mb-2">{selected.label}</div>
            <div className="text-sm">{selected.description}</div>
            <button
              className="mt-4 px-2 py-1 bg-blue-600 text-white rounded"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeList;

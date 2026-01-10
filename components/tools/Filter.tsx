import React from 'react';

interface FilterProps {
  categories: string[];
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
}

const Filter: React.FC<FilterProps> = ({
  categories,
  search,
  onSearchChange,
  category,
  onCategoryChange,
}) => (
  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
    <label htmlFor="tool-search" className="sr-only">
      Search tools
    </label>
    <input
      id="tool-search"
      type="search"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Search tools"
      className="flex-1 rounded border p-2"
    />
    <label htmlFor="tool-category" className="sr-only">
      Filter category
    </label>
    <select
      id="tool-category"
      value={category}
      onChange={(e) => onCategoryChange(e.target.value)}
      className="rounded border p-2"
    >
      <option value="">All Categories</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  </div>
);

export default Filter;

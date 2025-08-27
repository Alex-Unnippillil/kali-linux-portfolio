import React from 'react';

interface Props {
  title: string;
}

const Titlebar: React.FC<Props> = ({ title }) => {
  return (
    <div className="relative bg-ub-window-title border-t-2 border-white border-opacity-5 py-1.5 px-3 text-white w-full select-none rounded-b-none">
      <div className="flex justify-center text-sm font-bold truncate" title={title}>{title}</div>
    </div>
  );
};

export default Titlebar;

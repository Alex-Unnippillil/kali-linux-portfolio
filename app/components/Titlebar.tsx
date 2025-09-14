import type { FC } from 'react';

const Titlebar: FC = () => (
  <div
    className="h-8 w-full"
    style={{
      WebkitAppRegion: 'drag',
      paddingLeft: 'env(titlebar-area-x)'
    }}
  />
);

export default Titlebar;

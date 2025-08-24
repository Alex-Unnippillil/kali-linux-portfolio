import React from 'react';

const WallpaperPreview = ({ src }) => (
  <div
    className="md:w-2/5 w-2/3 h-1/3 m-auto my-4"
    style={{
      backgroundImage: `url(${src})`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
    }}
  />
);

export default WallpaperPreview;

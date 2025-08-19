import React from 'react';

const bgImages = {
  'wall-1': './images/wallpapers/wall-1.webp',
  'wall-2': './images/wallpapers/wall-2.webp',
  'wall-3': './images/wallpapers/wall-3.webp',
  'wall-4': './images/wallpapers/wall-4.webp',
  'wall-5': './images/wallpapers/wall-5.webp',
  'wall-6': './images/wallpapers/wall-6.webp',
  'wall-7': './images/wallpapers/wall-7.webp',
  'wall-8': './images/wallpapers/wall-8.webp',
};

interface BackgroundImageProps {
  img: keyof typeof bgImages;
}

export default function BackgroundImage({ img }: BackgroundImageProps): JSX.Element {
  const style: React.CSSProperties = {
    backgroundImage: `url(${bgImages[img]})`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPositionX: 'center',
  };

  return <div style={style} className="bg-ubuntu-img absolute -z-10 top-0 right-0 overflow-hidden h-full w-full" />;
}

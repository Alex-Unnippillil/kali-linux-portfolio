import React from 'react';

const WallpapersInfo: React.FC = () => (
  <section className="p-4 rounded bg-ub-grey text-white">
    <h2 className="text-xl font-bold mb-2">Wallpapers</h2>
    <p>
      Looking for fresh backgrounds? Download the official Kali Linux wallpapers from{' '}
      <a
        href="https://www.kali.org/docs/introduction/kali-linux-wallpaper/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-ub-orange underline"
      >
        kali.org
      </a>
      .
    </p>
  </section>
);

export default WallpapersInfo;

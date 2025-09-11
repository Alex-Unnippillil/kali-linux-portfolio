import React from 'react';

const KaliHero: React.FC = () => (
  <section className="kali-hero">
    <div className="kali-hero__content">
      <h1 className="kali-hero__title">Kali Linux</h1>
      <p className="kali-hero__tagline">The most advanced penetration testing distribution</p>
      <div className="kali-hero__actions">
        <a
          href="https://www.kali.org/get-kali/"
          className="kali-hero__btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Kali
        </a>
        <a
          href="https://www.kali.org/docs/"
          className="kali-hero__btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Documentation
        </a>
      </div>
    </div>
  </section>
);

export default KaliHero;


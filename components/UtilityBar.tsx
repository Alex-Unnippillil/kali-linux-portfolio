import React from 'react';

const UtilityBar: React.FC = () => (
  <div className="h-6 w-full bg-ub-dark-grey text-ubt-grey text-xs flex items-center justify-center">
    <a
      href="https://www.offsec.com/events/the-gauntlet/?utm_source=kali&utm_medium=web&utm_campaign=menu"
      className="text-ubt-blue hover:underline focus:underline"
    >
      Join Free CTF
    </a>
  </div>
);

export default UtilityBar;

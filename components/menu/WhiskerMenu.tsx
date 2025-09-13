import React from 'react';
import Image from 'next/image';

const WhiskerMenu: React.FC = () => {
  const toggleMenu = () => {
    const menu = document.getElementById('appmenu');
    if (!menu) return;
    if (menu.hasAttribute('hidden')) {
      menu.removeAttribute('hidden');
      (menu.querySelector('#appmenu-search') as HTMLInputElement | null)?.focus();
    } else {
      menu.setAttribute('hidden', '');
    }
  };

  return (
    <button
      type="button"
      onClick={toggleMenu}
      className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
    >
      <Image
        src="/themes/Yaru/status/decompiler-symbolic.svg"
        alt="Menu"
        width={16}
        height={16}
        className="inline mr-1"
      />
      Applications
    </button>
  );
};

export default WhiskerMenu;


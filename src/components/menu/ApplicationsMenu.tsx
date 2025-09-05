'use client';

import React, { useEffect, useState } from 'react';
import loadMenu, { MenuCategory } from '../../lib/menu/garcon';

const ApplicationsMenu: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);

  useEffect(() => {
    loadMenu()
      .then((cats) => setCategories(cats))
      .catch((err) => console.error('Failed to load menu', err));
  }, []);

  return (
    <nav>
      {categories.map((category) => (
        <div key={category.id} className="mb-4">
          <h3 className="font-bold mb-2">{category.name}</h3>
          <ul className="ml-4 list-disc">
            {category.items.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export default ApplicationsMenu;

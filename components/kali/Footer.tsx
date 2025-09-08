import React from 'react';
import ia from '../../data/ia.json';

interface Group {
  label: string;
  items: { label: string; href: string }[];
}

const Footer: React.FC = () => (
  <footer className="border-t border-gray-700 p-4 mt-8 text-sm">
    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
      {(ia as any).footer.groups.map((group: Group) => (
        <div key={group.label}>
          <h4 className="font-semibold mb-2">{group.label}</h4>
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <h4 className="font-semibold mb-2">Follow Us</h4>
        <ul className="flex flex-wrap gap-2">
          {(ia as any).footer.social.map((s: { label: string; href: string }) => (
            <li key={s.label}>
              <a href={s.href} className="hover:underline">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </footer>
);

export default Footer;

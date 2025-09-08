import React from 'react';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { useRouter } from 'next/router';
import communityLinks from '../content/community-links.json';

interface CommunityLink {
  name: string;
  url: string;
}

const CommunityPage: React.FC = () => {
  const router = useRouter();
  const path = [{ name: 'Home' }, { name: 'Community' }];

  const handleNavigate = (index: number) => {
    if (index === 0) {
      router.push('/');
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Breadcrumbs path={path} onNavigate={handleNavigate} />
      <h1 className="text-2xl font-bold mt-4 mb-4">Community</h1>
      <p className="text-xs text-gray-500 mb-6">
        This is an unofficial community page and is not affiliated with or endorsed
        by Kali Linux, Offensive Security, or any related entities.
      </p>
      <ul className="list-disc list-inside space-y-2">
        {(communityLinks as CommunityLink[]).map((link, idx) => (
          <li key={idx}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {link.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CommunityPage;

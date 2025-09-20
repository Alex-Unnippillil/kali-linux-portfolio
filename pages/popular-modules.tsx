import { getPageMetadata } from '@/lib/metadata';
import React from 'react';
import PopularModules from '../components/PopularModules';
export const metadata = getPageMetadata('/popular-modules');

const PopularModulesPage: React.FC = () => {
  return <PopularModules />;
};

export default PopularModulesPage;


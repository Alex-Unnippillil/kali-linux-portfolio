import dynamic from 'next/dynamic';

const WhiskerMenuClient = dynamic(() => import('./WhiskerMenuClient'), {
  ssr: false,
  loading: () => null,
});

const WhiskerMenu = () => <WhiskerMenuClient />;

export default WhiskerMenu;

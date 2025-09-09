import dynamic from 'next/dynamic';

const FlappyBird = dynamic(() => import('../../apps/flappy-bird'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default FlappyBird;

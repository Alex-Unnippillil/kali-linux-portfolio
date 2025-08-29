import dynamic from 'next/dynamic';

const Map = dynamic(() => import('../../components/ui/Map'), { ssr: false });

const MapPage = () => (
  <div className="w-full h-screen">
    <Map />
  </div>
);

export default MapPage;

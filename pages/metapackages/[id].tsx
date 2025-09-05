import { useRouter } from 'next/router';
import Link from 'next/link';
import meta from '../../data/metapackages.json';

const MetapackageInfo = () => {
  const router = useRouter();
  const { id } = router.query;
  if (!id || Array.isArray(id)) return null;
  const pack = (meta as any[]).find((m) => m.id === id);
  if (!pack) {
    return <p className="p-4">Metapackage not found.</p>;
  }
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-2xl font-bold">{pack.title}</h1>
      <p>{pack.description}</p>
      <Link
        href={pack.link}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-blue-500"
      >
        Official package list
      </Link>
    </div>
  );
};

export default MetapackageInfo;


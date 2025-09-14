import { GetServerSideProps } from 'next';
import { fetchAndSignChecksums } from '../lib/checksums';

interface DownloadItem {
  name: string;
  url: string;
  checksum: string;
}

interface DownloadsPageProps {
  items: DownloadItem[];
}

const DOWNLOADS: Omit<DownloadItem, 'checksum'>[] = [
  { name: 'Resume PDF', url: '/resume.pdf' },
  { name: 'vCard', url: '/assets/alex-unnippillil.vcf' },
];

export default function DownloadsPage({ items }: DownloadsPageProps) {
  const copy = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Downloads</h1>
      <ul className="space-y-4">
        {items.map(({ name, url, checksum }) => (
          <li key={url} className="flex flex-col sm:flex-row sm:items-center">
            <a href={url} className="text-ubt-blue underline mr-2">{name}</a>
            <div className="flex items-center mt-2 sm:mt-0">
              <code className="bg-gray-800 text-gray-100 px-2 py-1 text-xs rounded w-[20ch]">
                {checksum}
              </code>
              <button
                type="button"
                className="ml-2 px-2 py-1 text-xs bg-ub-gedit-light rounded"
                onClick={() => copy(checksum)}
              >
                Copy
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<DownloadsPageProps> = async () => {
  const { checksums } = await fetchAndSignChecksums();
  const items: DownloadItem[] = DOWNLOADS.map((d) => ({
    ...d,
    checksum: checksums[d.url] || '',
  }));
  return { props: { items } };
};

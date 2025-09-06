import Image from 'next/image';

const GrubPreview = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white">
      <Image
        src="/images/logos/logo_1200.png"
        alt="Kali logo"
        width={200}
        height={200}
        priority
        className="mb-8"
      />
      <div className="w-full max-w-md border border-gray-700 bg-gray-900 font-mono">
        <div className="p-2 text-center text-sm text-gray-400">GNU GRUB version 2.06</div>
        <ul>
          <li className="bg-blue-600 px-4 py-1">Kali GNU/Linux</li>
          <li className="px-4 py-1">Advanced options for Kali GNU/Linux</li>
          <li className="px-4 py-1">Memory test (memtest86+)</li>
          <li className="px-4 py-1">Memory test (memtest86+, serial console)</li>
        </ul>
        <div className="p-2 text-center text-xs text-gray-400">Use ↑ and ↓ keys to select an entry</div>
      </div>
      <p className="mt-6 max-w-xl text-center text-sm text-gray-400">
        This page is a visual preview of a GRUB boot menu. Operating system theme
        changes must be made at the OS level and cannot be performed here.
      </p>
    </main>
  );
};

export default GrubPreview;


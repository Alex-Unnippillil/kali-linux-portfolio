import Link from 'next/link';

export default function UndercoverDisclaimer() {
  return (
    <main className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Undercover Mode Disclaimer</h1>
      <p>
        Undercover mode provides a generic workspace with a Windows-like appearance for
        demonstration purposes. It is not affiliated with or endorsed by Microsoft.
      </p>
      <p>
        Icons and visual elements are generic and included only to help the desktop blend
        in during public use while avoiding trademarked assets.
      </p>
      <p>
        <Link href="/">Return to desktop</Link>
      </p>
    </main>
  );
}

import Image from 'next/image';
import Link from 'next/link';

export default function UndercoverPage() {
  return (
    <main className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Undercover Mode</h1>
      <div className="flex justify-center">
        <Image
          src="/themes/Undercover/system/undercover.svg"
          alt="Undercover mode icon"
          width={128}
          height={128}
        />
      </div>
      <p>
        Undercover mode switches the desktop to a generic, Windows-like appearance to
        help you blend in during presentations or public work. It is not affiliated
        with or endorsed by Microsoft.
      </p>
      <p>
        In this user interface the Undercover mode is purely cosmetic—only the theme
        changes, not the underlying functionality or security.
      </p>
      <p>
        Icons and visual elements are generic and included solely to help the desktop
        blend in while avoiding trademarked assets.
      </p>
      <p>
        Learn more in the{' '}
        <Link
          href="https://www.kali.org/docs/general-use/kali-undercover/"
          className="underline text-blue-600"
        >
          official documentation
        </Link>
        .
      </p>
      <p>
        <Link href="/" className="underline text-blue-600">
          Return to desktop
        </Link>
      </p>
    </main>
  );
}

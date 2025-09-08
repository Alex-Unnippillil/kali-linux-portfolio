import React from 'react';

interface ImageOption {
  name: string;
  details: string;
  preferred?: boolean;
}

const options: ImageOption[] = [
  {
    name: 'Installer',
    details:
      'Full offline installation. Includes most packages and is recommended for most users.',
    preferred: true,
  },
  {
    name: 'Net Installer',
    details:
      'Minimal download that fetches packages during setup. Requires an internet connection.',
  },
  {
    name: 'Live',
    details:
      'Bootable environment that runs from USB without installing. Optional persistence.',
  },
];

export default function ImageComparison() {
  return (
    <table className="w-full border-collapse" role="grid">
      <caption className="sr-only">Comparison of Kali image types</caption>
      <thead>
        <tr>
          <th scope="col" className="border p-2 text-left">
            Image
          </th>
          <th scope="col" className="border p-2 text-left">
            Details
          </th>
        </tr>
      </thead>
      <tbody>
        {options.map((opt) => (
          <tr key={opt.name} className={opt.preferred ? 'bg-green-50' : undefined}>
            <th scope="row" className="border p-2 font-semibold">
              {opt.name}
              {opt.preferred && (
                <span className="ml-2 rounded bg-green-600 px-1.5 py-0.5 text-xs text-white">
                  Preferred
                </span>
              )}
            </th>
            <td className="border p-2">{opt.details}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


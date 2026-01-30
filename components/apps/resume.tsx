import React from 'react';
import ReactGA from 'react-ga4';

const RESUME_URL = '/assets/Alex-Unnippillil-Resume.pdf';
const VCARD_URL = '/assets/alex-unnippillil.vcf';

export default function ResumeApp() {
  const handleDownload = () => {
    ReactGA.event({ category: 'resume', action: 'download' });
  };

  const handleShare = async () => {
    if (!navigator.share) {
      window.location.href = VCARD_URL;
      return;
    }
    try {
      await navigator.share({
        title: 'Alex Unnippillil Contact',
        url: window.location.origin + VCARD_URL,
      });
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-ub-grey text-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-black/40 bg-ub-cool-grey px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Resume</h1>
          <p className="text-xs text-gray-300">Quick access to Alex's PDF resume and contact card.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={RESUME_URL}
            download
            onClick={handleDownload}
            className="rounded bg-ub-gedit-light px-2 py-1 text-sm"
          >
            Download PDF
          </a>
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleDownload}
            className="rounded bg-ub-gedit-light px-2 py-1 text-sm"
          >
            Open in new tab
          </a>
          <a href={VCARD_URL} download className="rounded bg-ub-gedit-light px-2 py-1 text-sm">
            vCard
          </a>
          <button onClick={handleShare} className="rounded bg-ub-gedit-light px-2 py-1 text-sm">
            Share contact
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <object className="h-full w-full" data={RESUME_URL} type="application/pdf">
          <p className="p-4 text-center">
            Unable to display PDF.&nbsp;
            <a
              href={RESUME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-ubt-blue"
              onClick={handleDownload}
            >
              Download the resume
            </a>
          </p>
        </object>
      </div>
    </div>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import FilePreviewArticle from '../_components/FilePreviewArticle';
import {
  filePreviewRecords,
  getFilePreviewById,
} from '@/data/files/previews';

interface PageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return filePreviewRecords.map((record) => ({ id: record.id }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const preview = getFilePreviewById(params.id);
  if (!preview) {
    return {
      title: 'File preview',
    };
  }

  return {
    title: `${preview.title} • Files preview`,
    description: preview.summary,
  };
}

export default function FilePreviewPage({ params }: PageProps) {
  const preview = getFilePreviewById(params.id);

  if (!preview) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010409] via-[#020b1a] to-[#020617]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center justify-between text-sm">
          <Link
            href="/apps"
            className="inline-flex items-center gap-2 text-cyan-200 transition hover:text-cyan-100"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to desktop
          </Link>
          <span className="text-xs uppercase tracking-wide text-cyan-300">
            Direct file preview
          </span>
        </nav>
        <FilePreviewArticle item={preview} headingId="file-preview-title" />
        <p className="text-xs text-gray-400">
          Share this URL with collaborators to let them review the artifact without
          opening the Files app. Press the browser back button to return to your
          previous workspace.
        </p>
      </div>
    </div>
  );
}

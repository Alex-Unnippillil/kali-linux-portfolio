import { notFound } from 'next/navigation';
import FilePreviewArticle from '@/app/apps/files/preview/_components/FilePreviewArticle';
import {
  filePreviewRecords,
  getFilePreviewById,
} from '@/data/files/previews';
import ModalShell from './ModalShell';

interface PageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return filePreviewRecords.map((record) => ({ id: record.id }));
}

export default function FilePreviewModal({ params }: PageProps) {
  const preview = getFilePreviewById(params.id);

  if (!preview) {
    notFound();
  }

  return (
    <ModalShell labelledBy="file-preview-modal-heading">
      <FilePreviewArticle
        item={preview}
        headingId="file-preview-modal-heading"
        variant="modal"
      />
    </ModalShell>
  );
}

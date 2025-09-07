'use client';

import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
});

(PdfViewer as any).preload = () => import('./PdfViewer');

export default PdfViewer;

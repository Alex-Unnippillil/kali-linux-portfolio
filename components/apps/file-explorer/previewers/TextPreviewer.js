'use client';

import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import PreviewFrame from './PreviewFrame';
import { escapeHtml } from './utils';

export default function TextPreviewer({ content = '' }) {
  const sanitizedHtml = useMemo(() => {
    const escaped = escapeHtml(content);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:16px;background:#111827;color:#e5e7eb;font-family:monospace;white-space:pre-wrap;word-break:break-word;">${escaped}</body></html>`;
    return DOMPurify.sanitize(html);
  }, [content]);

  return <PreviewFrame html={sanitizedHtml} title="Text preview" />;
}

'use client';

import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import PreviewFrame from './PreviewFrame';
import { escapeHtml } from './utils';

function formatJson(content) {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

export default function JsonPreviewer({ content = '' }) {
  const sanitizedHtml = useMemo(() => {
    const formatted = formatJson(content);
    const escaped = escapeHtml(formatted);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:16px;background:#111827;color:#e5e7eb;font-family:monospace;white-space:pre;overflow:auto;">${escaped}</body></html>`;
    return DOMPurify.sanitize(html);
  }, [content]);

  return <PreviewFrame html={sanitizedHtml} title="JSON preview" />;
}

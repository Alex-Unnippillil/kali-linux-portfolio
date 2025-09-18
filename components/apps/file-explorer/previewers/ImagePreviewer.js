'use client';

import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import PreviewFrame from './PreviewFrame';
import { escapeHtml } from './utils';

export default function ImagePreviewer({ src, alt = 'Image preview' }) {
  const sanitizedHtml = useMemo(() => {
    const safeSrc = escapeHtml(src || '');
    const escapedAlt = escapeHtml(alt);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body style="margin:0;display:flex;align-items:center;justify-content:center;background:#111827;"><img src="${safeSrc}" alt="${escapedAlt}" style="max-width:100%;max-height:100%;object-fit:contain;" /></body></html>`;
    return DOMPurify.sanitize(html, { ADD_URI_SAFE_LIST: ['blob', 'data'] });
  }, [src, alt]);

  return <PreviewFrame html={sanitizedHtml} title="Image preview" />;
}

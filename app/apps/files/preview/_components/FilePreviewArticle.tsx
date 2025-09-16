import Link from 'next/link';
import type {
  FilePreviewRecord,
  PreviewBlock,
} from '@/data/files/previews';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
  timeZoneName: 'short',
});

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormatter.format(date);
}

function renderMarkdown(content: string, index: number) {
  const lines = content.split('\n').filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  const headingLine = lines[0];
  const title = headingLine.replace(/^\*\*/u, '').replace(/\*\*$/u, '');
  const bulletLines = lines.slice(1).map((line) => line.replace(/^[-*]\s*/u, '').trim());

  return (
    <section key={`markdown-${index}`} aria-label={title} className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
        {title}
      </h3>
      <ul className="space-y-2 text-sm text-gray-100">
        {bulletLines.map((item, idx) => (
          <li key={`md-${index}-${idx}`} className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400"
            />
            <span className="flex-1 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function renderBlock(block: PreviewBlock, index: number) {
  switch (block.kind) {
    case 'text':
      return (
        <p
          key={`text-${index}`}
          className="text-sm leading-relaxed text-gray-100 whitespace-pre-wrap"
        >
          {block.content}
        </p>
      );
    case 'code':
      if (block.language === 'markdown') {
        return renderMarkdown(block.content, index);
      }
      return (
        <pre
          key={`code-${index}`}
          className="overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-gray-100 shadow-inner"
        >
          <code>{block.content}</code>
        </pre>
      );
    case 'image':
      return (
        <figure
          key={`image-${index}`}
          className="overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-lg"
        >
          <img
            src={block.src}
            alt={block.alt}
            className="w-full object-cover"
            loading="lazy"
          />
          {block.caption ? (
            <figcaption className="px-4 py-3 text-xs text-gray-300">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    default:
      return null;
  }
}

function MetadataGrid({
  item,
}: {
  item: FilePreviewRecord;
}) {
  const metadataEntries: Array<[string, string]> = [
    ['Collected', formatDate(item.createdAt)],
    ['File size', item.size],
    ...Object.entries(item.metadata),
  ];

  return (
    <dl className="grid gap-4 border-b border-white/10 px-6 py-5 text-sm text-gray-100 sm:grid-cols-2">
      {metadataEntries.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
          </dt>
          <dd className="font-medium text-white break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TagPills({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="File tags">
      {tags.map((tag) => (
        <li key={tag}>
          <span className="inline-flex items-center rounded-full border border-cyan-500/60 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-200">
            {tag}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface FilePreviewArticleProps {
  item: FilePreviewRecord;
  headingId?: string;
  variant?: 'page' | 'modal';
}

export default function FilePreviewArticle({
  item,
  headingId,
  variant = 'page',
}: FilePreviewArticleProps) {
  const heading = headingId ?? 'file-preview-heading';
  const containerStyles =
    variant === 'modal'
      ? 'rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl'
      : 'rounded-3xl border border-white/10 bg-[#0f172a] shadow-2xl backdrop-blur';

  return (
    <article className={`${containerStyles} overflow-hidden`}> 
      <header className="border-b border-white/10 bg-white/5 px-6 pb-5 pt-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Evidence preview
        </div>
        <h1 id={heading} className="mt-2 text-2xl font-semibold text-white">
          {item.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-200">{item.summary}</p>
        <TagPills tags={item.tags} />
      </header>
      <MetadataGrid item={item} />
      <div className="space-y-6 px-6 py-6">{item.blocks.map(renderBlock)}</div>
      {item.downloadUrl ? (
        <footer className="border-t border-white/10 bg-white/5 px-6 py-4">
          <Link
            href={item.downloadUrl}
            download
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 12 12 16.5m0 0 4.5-4.5M12 16.5V3"
              />
            </svg>
            Download raw artifact
          </Link>
        </footer>
      ) : null}
    </article>
  );
}

import { Children, cloneElement, isValidElement, ReactElement, ReactNode, useId } from 'react';

export interface FootnotesProps {
  /**
   * Footnote items rendered as <Footnotes.Item> children.
   */
  children?: ReactNode;
  /**
   * Optional section title rendered above the ordered list.
   */
  title?: string;
  /**
   * Additional class names for the wrapper section.
   */
  className?: string;
  /**
   * Accessible label announced on backlinks.
   */
  returnLabel?: string;
}

interface FootnoteItemProps {
  children?: ReactNode;
  className?: string;
  returnLabel?: string;
  identifier?: string;
  label?: string;
  referenceIds?: string[] | string;
  'data-footnote-id'?: string;
  'data-footnote-label'?: string;
  'data-reference-ids'?: string | string[];
}

const parseReferenceIds = (value?: string | string[]): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((refId): refId is string => typeof refId === 'string' && refId.length > 0);
  }
  return value
    .split(/\s+/)
    .map((ref) => ref.trim())
    .filter(Boolean);
};

const DEFAULT_BACKLINK_LABEL = 'Back to content';

const FootnoteItem = ({
  children,
  className,
  returnLabel = DEFAULT_BACKLINK_LABEL,
  identifier,
  label,
  referenceIds,
  'data-footnote-id': dataId,
  'data-footnote-label': dataLabel,
  'data-reference-ids': dataReferences,
}: FootnoteItemProps) => {
  const noteId = (typeof dataId === 'string' && dataId) || (typeof identifier === 'string' && identifier) || undefined;
  const displayLabel =
    (typeof dataLabel === 'string' && dataLabel) ||
    (typeof label === 'string' && label) ||
    (noteId ? noteId.replace(/^fn-/, '') : '');
  const refs = parseReferenceIds(dataReferences ?? referenceIds);

  const itemClass = className ? `leading-relaxed ${className}` : 'leading-relaxed';

  return (
    <li id={noteId} role="doc-endnote" tabIndex={-1} className={itemClass}>
      <div>{children}</div>
      {refs.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-2 text-xs">
          {refs.map((refId, index) => (
            <a
              key={refId}
              href={`#${refId}`}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sky-700 hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              aria-label={`${returnLabel} ${displayLabel}${refs.length > 1 ? ` (${index + 1})` : ''}`}
            >
              ↩︎
            </a>
          ))}
        </p>
      )}
    </li>
  );
};

FootnoteItem.displayName = 'FootnoteItem';

type FootnotesComponent = ((props: FootnotesProps) => JSX.Element | null) & {
  Item: typeof FootnoteItem;
};

const Footnotes: FootnotesComponent = (({
  children,
  title = 'Footnotes',
  className,
  returnLabel = DEFAULT_BACKLINK_LABEL,
}: FootnotesProps) => {
  const headingId = useId();
  const items = Children.toArray(children).filter(Boolean) as ReactElement[];

  if (items.length === 0) {
    return null;
  }

  const baseClass = 'mt-8 border-t border-slate-200 pt-4 text-sm text-slate-900';
  const wrapperClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <section className={wrapperClass} aria-labelledby={headingId} role="doc-endnotes">
      <h2 id={headingId} className="text-base font-semibold">
        {title}
      </h2>
      <ol className="mt-3 list-decimal space-y-3 pl-6">
        {items.map((item, index) =>
          isValidElement(item)
            ? cloneElement(item, {
                key: item.key ?? `footnote-${index + 1}`,
                returnLabel,
              })
            : item,
        )}
      </ol>
    </section>
  );
}) as FootnotesComponent;

Footnotes.Item = FootnoteItem;

export default Footnotes;

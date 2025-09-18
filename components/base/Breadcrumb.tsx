import { FormEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";

export interface BreadcrumbSegment {
  id?: string;
  label: string;
}

export interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  onNavigate?: (index: number) => void;
  onEdit?: (value: string) => void | Promise<void>;
  allowEditing?: boolean;
  ariaLabel?: string;
  editButtonLabel?: string;
  inputLabel?: string;
  className?: string;
  separator?: ReactNode;
}

const joinSegments = (segments: BreadcrumbSegment[]): string => {
  if (segments.length === 0) return "";
  return segments.reduce((acc, segment, index) => {
    const label = segment.label || "";
    if (index === 0) {
      return label === "/" ? "/" : label;
    }
    if (acc === "/") {
      return `${acc}${label}`;
    }
    return `${acc}/${label}`;
  }, "");
};

export default function Breadcrumb({
  segments,
  onNavigate,
  onEdit,
  allowEditing = false,
  ariaLabel = "Breadcrumb",
  editButtonLabel = "Edit path",
  inputLabel = "Path",
  className = "",
  separator = "/",
}: BreadcrumbProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  const pathString = useMemo(() => joinSegments(segments), [segments]);

  useEffect(() => {
    if (!allowEditing) return;
    setDraft(pathString);
  }, [allowEditing, pathString]);

  useEffect(() => {
    if (isEditing) {
      setDraft(pathString);
    }
  }, [isEditing, pathString]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  if (!segments.length) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!allowEditing) {
      setIsEditing(false);
      return;
    }
    try {
      await onEdit?.(draft.trim());
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <nav
      aria-label={ariaLabel}
      className={`flex items-center text-white text-sm gap-1 ${className}`.trim()}
    >
      <ol className="flex items-center gap-1">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const key = segment.id ?? `${segment.label}-${index}`;
          const showEditableInput = isLast && allowEditing && isEditing;

          const separatorElement =
            !isLast && separator ? (
              <span aria-hidden="true" className="text-ubt-grey">
                {separator}
              </span>
            ) : null;

          if (showEditableInput) {
            return (
              <li key={key} className="flex items-center gap-1">
                <form className="flex items-center" onSubmit={handleSubmit}>
                  <label htmlFor={formId} className="sr-only">
                    {inputLabel}
                  </label>
                  <input
                    ref={inputRef}
                    id={formId}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => {
                      setIsEditing(false);
                      setDraft(pathString);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setIsEditing(false);
                        setDraft(pathString);
                      }
                    }}
                    className="bg-black/40 text-white px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-ubt-blue"
                    aria-label={inputLabel}
                  />
                </form>
                {separatorElement}
              </li>
            );
          }

          return (
            <li key={key} className="flex items-center gap-1">
              {isLast && allowEditing ? (
                <div className="flex items-center gap-1">
                  <span aria-current="page" className="font-medium">
                    {segment.label || "/"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(pathString);
                      setIsEditing(true);
                    }}
                    className="px-1 py-0.5 rounded hover:bg-black/40 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ub-cool-grey"
                    aria-label={editButtonLabel}
                  >
                    <span aria-hidden="true">✎</span>
                    <span className="sr-only">{editButtonLabel}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!isLast) onNavigate?.(index);
                  }}
                  className={`px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ub-cool-grey ${
                    isLast ? "font-medium cursor-default" : "hover:bg-black/30"
                  }`}
                  aria-current={isLast ? "page" : undefined}
                  disabled={isLast}
                >
                  {segment.label || "/"}
                </button>
              )}
              {separatorElement}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { joinSegments };

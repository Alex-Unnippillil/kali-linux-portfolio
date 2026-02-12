import type { ScriptHTMLAttributes } from 'react';

export type JsonLdProps<T> = {
  data: T;
} & Pick<ScriptHTMLAttributes<HTMLScriptElement>, 'id' | 'nonce'>;

export function JsonLd<T>({ data, id, nonce }: JsonLdProps<T>) {
  if (!data) {
    return null;
  }

  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      {...(id ? { id } : {})}
      {...(nonce ? { nonce } : {})}
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

import { Readable } from 'stream';
import type { IncomingMessage } from 'http';

import {
  buildRedirectDestination,
  createNoteContent,
  extractShareValuesFromBody,
  extractShareValuesFromQuery,
  mergeShareSources,
} from '../pages/share-target';

function createRequestStream(
  body: string,
  contentType = 'application/x-www-form-urlencoded',
): IncomingMessage {
  const stream = new Readable({
    read() {
      this.push(body);
      this.push(null);
    },
  }) as unknown as IncomingMessage & { headers: Record<string, string>; method: string; complete: boolean };

  stream.headers = { 'content-type': contentType };
  stream.method = 'POST';
  stream.complete = false;

  return stream;
}

describe('share target utilities', () => {
  it('extracts share values from the query string', () => {
    const result = extractShareValuesFromQuery({
      title: '  Shared Title  ',
      text: ['Primary note', ''],
      url: 'https://example.com  ',
      ignored: 'value',
    });

    expect(result).toEqual({
      title: ['Shared Title'],
      text: ['Primary note'],
      url: ['https://example.com'],
    });
  });

  it('merges query and body values while keeping order', () => {
    const queryValues = {
      title: ['Shared Title'],
      text: ['First line'],
    };

    const bodyValues = {
      text: ['Second line'],
      url: ['https://example.com'],
    };

    const merged = mergeShareSources(queryValues, bodyValues);

    expect(merged).toEqual({
      title: ['Shared Title'],
      text: ['First line', 'Second line'],
      url: ['https://example.com'],
    });
  });

  it('creates note content in the expected order', () => {
    const content = createNoteContent({
      title: ['Shared Title'],
      text: ['Message body'],
      url: ['https://example.com/post'],
    });

    expect(content).toBe('Shared Title\n\nMessage body\n\nhttps://example.com/post');
  });

  it('encodes redirect destination with source tag', () => {
    const destination = buildRedirectDestination('Shared Title\n\nMessage body');
    const url = new URL(destination, 'https://example.com');

    expect(url.pathname).toBe('/apps/sticky_notes');
    expect(url.searchParams.get('text')).toBe('Shared Title\n\nMessage body');
    expect(url.searchParams.get('source')).toBe('share-target');
  });

  it('includes only the source tag when there is no shared content', () => {
    const destination = buildRedirectDestination('');
    const url = new URL(destination, 'https://example.com');

    expect(url.pathname).toBe('/apps/sticky_notes');
    expect(url.searchParams.get('source')).toBe('share-target');
    expect(url.searchParams.has('text')).toBe(false);
  });

  it('parses urlencoded body payloads', async () => {
    const req = createRequestStream(
      'title=Shared+Title&text=Message+body&url=https%3A%2F%2Fexample.com%2Fpost',
    );
    const values = await extractShareValuesFromBody(req);

    expect(values).toEqual({
      title: ['Shared Title'],
      text: ['Message body'],
      url: ['https://example.com/post'],
    });
  });

  it('ignores bodies with unsupported content types', async () => {
    const req = createRequestStream('text=hello', 'text/plain');
    const values = await extractShareValuesFromBody(req);
    expect(values).toBeUndefined();
  });
});


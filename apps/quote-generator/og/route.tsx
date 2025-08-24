import { ImageResponse } from 'next/og';
import { TEMPLATES, DEFAULT_TEMPLATE } from '../../../components/apps/quote_templates';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const quote = searchParams.get('quote') || '';
  const author = searchParams.get('author') || '';
  const template = searchParams.get('template') || DEFAULT_TEMPLATE;
  const style = TEMPLATES[template] || TEMPLATES[DEFAULT_TEMPLATE];
  const bg = style.og?.background || '#000000';
  const color = style.og?.color || '#ffffff';
  return new ImageResponse(
    (
      <div
        style={{
          background: bg,
          color,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, fontStyle: 'italic', lineHeight: 1.4 }}>
          “{quote.slice(0, 200)}”
        </div>
        <div style={{ marginTop: 40, fontSize: 36 }}>- {author.slice(0, 100)}</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

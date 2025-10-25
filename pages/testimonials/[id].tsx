import Image from 'next/image';
import Link from 'next/link';
import { testimonials, Testimonial } from '@/data/testimonials';

interface Props {
  testimonial: Testimonial;
}

export default function TestimonialDetail({ testimonial }: Props) {
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <Link href="/testimonials" className="text-sm text-blue-600">
        &larr; Back
      </Link>
      <div className="mt-4 flex items-center gap-4">
        <Image
          src={testimonial.avatar}
          alt={`${testimonial.name} avatar`}
          width={80}
          height={80}
          className="rounded-full"
        />
        <div>
          <h2 className="text-xl font-semibold">{testimonial.name}</h2>
          <p className="text-sm text-gray-600">{testimonial.role}</p>
          <span className="mt-1 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
            {testimonial.relationship}
          </span>
        </div>
      </div>
      <blockquote className="mt-6 border-l-4 border-blue-500 pl-4 italic text-lg">
        {testimonial.pullQuote}
      </blockquote>
      <p className="mt-4 whitespace-pre-line">{testimonial.content}</p>
      {testimonial.source && (
        <p className="mt-6 text-sm">
          Source:{' '}
          <a
            href={testimonial.source.url}
            className="text-blue-600 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {testimonial.source.label}
          </a>
        </p>
      )}
    </main>
  );
}

export async function getStaticPaths() {
  return {
    paths: testimonials.map((t) => ({ params: { id: t.id } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { id: string } }) {
  const testimonial = testimonials.find((t) => t.id === params.id);
  return { props: { testimonial } };
}

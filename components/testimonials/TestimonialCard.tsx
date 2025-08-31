import Image from 'next/image';
import Link from 'next/link';
import { Testimonial } from '@/data/testimonials';

interface Props {
  testimonial: Testimonial;
}

export default function TestimonialCard({ testimonial }: Props) {
  return (
    <Link
      href={`/testimonials/${testimonial.id}`}
      className="block border rounded-lg p-4 hover:bg-gray-50 focus:outline-none"
    >
      <div className="flex items-center gap-4">
        <Image
          src={testimonial.avatar}
          alt={`${testimonial.name} avatar`}
          width={64}
          height={64}
          className="rounded-full"
        />
        <div>
          <p className="font-semibold">{testimonial.name}</p>
          <p className="text-sm text-gray-600">{testimonial.role}</p>
          <span className="mt-1 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
            {testimonial.relationship}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-700">{testimonial.snippet}</p>
      {testimonial.source && (
        <p className="mt-3 text-xs text-blue-600 underline">Source verified</p>
      )}
    </Link>
  );
}

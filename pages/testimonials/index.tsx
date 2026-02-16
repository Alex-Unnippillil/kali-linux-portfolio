import TestimonialCard from '@/components/testimonials/TestimonialCard';
import { testimonials } from '@/data/testimonials';

export default function TestimonialsPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <h1 className="mb-4 text-2xl">Testimonials</h1>
      <div className="grid gap-4">
        {testimonials.map((t) => (
          <TestimonialCard key={t.id} testimonial={t} />
        ))}
      </div>
    </main>
  );
}

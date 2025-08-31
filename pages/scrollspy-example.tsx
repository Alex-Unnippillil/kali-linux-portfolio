import StickyHeader from '../components/StickyHeader';

const sections = [
  { id: 'intro', label: 'Intro' },
  { id: 'features', label: 'Features' },
  { id: 'contact', label: 'Contact' },
];

export default function ScrollSpyExample() {
  return (
    <>
      <StickyHeader sections={sections} />
      <main id="main" className="p-4">
        <section id="intro" className="min-h-screen scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Intro</h2>
          <p>
            This example demonstrates a sticky header that highlights the active section
            as you scroll.
          </p>
        </section>
        <section id="features" className="min-h-screen scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Features</h2>
          <p>
            The header shrinks after you begin scrolling to keep content visible while
            maintaining navigation access.
          </p>
        </section>
        <section id="contact" className="min-h-screen scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4">Contact</h2>
          <p>
            The skip link allows keyboard users to jump directly to the main content
            without tabbing through the navigation each time.
          </p>
        </section>
      </main>
    </>
  );
}


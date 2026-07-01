import fs from 'fs';
import path from 'path';
import { GetStaticPaths, GetStaticProps } from 'next';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';
import { useMemo } from 'react';

interface Callout {
  type?: 'info' | 'warning' | 'success';
  text: string;
}

interface Section {
  content: string;
  callouts?: Callout[];
}

interface CaseStudy {
  slug: string;
  title: string;
  role: string;
  timeframe: string;
  outcomes: string[];
  cta: { label: string; href: string };
  facts?: { label: string; value: string }[];
  problem: Section;
  approach: Section;
  results: Section;
  lessons: Section;
}

const CalloutBlock = ({ type = 'info', children }: { type?: Callout['type']; children: React.ReactNode }) => {
  const style = {
    info: 'border-blue-500 bg-blue-50 text-blue-800',
    warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
    success: 'border-green-500 bg-green-50 text-green-800',
  }[type];
  return <div className={`my-4 border-l-4 p-4 ${style}`}>{children}</div>;
};

export default function CaseStudyPage({ caseStudy }: { caseStudy: CaseStudy }) {
  const sectionIds = useMemo(() => ['problem', 'approach', 'results', 'lessons'], []);
  const activeId = useIntersectionObserver(sectionIds);

  return (
    <div className="max-w-7xl mx-auto flex">
      <aside className="hidden lg:block w-64 mr-8">
        <div className="sticky top-24 space-y-8">
          <div>
            <h3 className="text-sm font-semibold mb-2">Quick Facts</h3>
            <dl className="text-sm space-y-1">
              <div>
                <dt className="font-medium">Role</dt>
                <dd>{caseStudy.role}</dd>
              </div>
              <div>
                <dt className="font-medium">Timeframe</dt>
                <dd>{caseStudy.timeframe}</dd>
              </div>
              {caseStudy.facts?.map((fact) => (
                <div key={fact.label}>
                  <dt className="font-medium">{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <nav>
            <h3 className="text-sm font-semibold mb-2">Jump to</h3>
            <ul className="space-y-1 text-sm">
              {sectionIds.map((id) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className={
                      activeId === id
                        ? 'text-[var(--color-primary)] font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }
                  >
                    {id.charAt(0).toUpperCase() + id.slice(1)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
      <main className="flex-1">
        <header className="py-12" id="hero">
          <h1 className="text-4xl font-bold mb-4">{caseStudy.title}</h1>
          <p className="mb-1"><strong>Role:</strong> {caseStudy.role}</p>
          <p className="mb-4"><strong>Timeframe:</strong> {caseStudy.timeframe}</p>
          <ul className="list-disc ml-6 mb-6">
            {caseStudy.outcomes.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <a
            href={caseStudy.cta.href}
            className="inline-block px-6 py-3 bg-[var(--color-primary)] text-white rounded"
          >
            {caseStudy.cta.label}
          </a>
        </header>
        <section id="problem" className="py-8">
          <h2 className="text-2xl font-semibold mb-4">Problem</h2>
          <p>{caseStudy.problem.content}</p>
          {caseStudy.problem.callouts?.map((c, i) => (
            <CalloutBlock key={i} type={c.type}>
              {c.text}
            </CalloutBlock>
          ))}
        </section>
        <section id="approach" className="py-8">
          <h2 className="text-2xl font-semibold mb-4">Approach</h2>
          <p>{caseStudy.approach.content}</p>
          {caseStudy.approach.callouts?.map((c, i) => (
            <CalloutBlock key={i} type={c.type}>
              {c.text}
            </CalloutBlock>
          ))}
        </section>
        <section id="results" className="py-8">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <p>{caseStudy.results.content}</p>
          {caseStudy.results.callouts?.map((c, i) => (
            <CalloutBlock key={i} type={c.type}>
              {c.text}
            </CalloutBlock>
          ))}
        </section>
        <section id="lessons" className="py-8">
          <h2 className="text-2xl font-semibold mb-4">Lessons</h2>
          <p>{caseStudy.lessons.content}</p>
          {caseStudy.lessons.callouts?.map((c, i) => (
            <CalloutBlock key={i} type={c.type}>
              {c.text}
            </CalloutBlock>
          ))}
        </section>
      </main>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const dir = path.join(process.cwd(), 'data', 'case-studies');
  const files = fs.readdirSync(dir);
  const paths = files.map((file) => ({ params: { slug: file.replace(/\.json$/, '') } }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  const file = fs.readFileSync(
    path.join(process.cwd(), 'data', 'case-studies', `${slug}.json`),
    'utf-8',
  );
  const caseStudy = JSON.parse(file);
  return { props: { caseStudy } };
};

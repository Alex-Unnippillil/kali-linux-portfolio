import Meta from '../components/SEO/Meta';

interface Service {
  title: string;
  scope: string;
  timeline: string;
  budget: string;
}

const services: Service[] = [
  {
    title: 'Web Application Penetration Test',
    scope: 'Identify vulnerabilities in web applications, including authentication, authorization and common OWASP issues.',
    timeline: 'Typically 2–3 weeks depending on application size.',
    budget: '$4k–$8k per application'
  },
  {
    title: 'Infrastructure Security Audit',
    scope: 'Review network and server configurations, external exposure and internal segmentation.',
    timeline: '3–4 weeks for small to mid‑sized environments.',
    budget: '$5k–$10k per engagement'
  },
  {
    title: 'Security Training Workshop',
    scope: 'Hands‑on training for development or ops teams covering secure coding and incident response basics.',
    timeline: '1 week preparation and 1–3 day on‑site or virtual session.',
    budget: '$2k–$5k per workshop'
  }
];

const process = [
  {
    phase: 'Discovery',
    milestone: 'Define goals & scope',
    artifact: 'Written scope of work'
  },
  {
    phase: 'Proposal',
    milestone: 'Agree on plan, budget & schedule',
    artifact: 'Signed proposal'
  },
  {
    phase: 'Execution',
    milestone: 'Testing with periodic updates',
    artifact: 'Weekly status notes'
  },
  {
    phase: 'Reporting',
    milestone: 'Deliver findings & remediation advice',
    artifact: 'Detailed report & briefing call'
  },
  {
    phase: 'Follow Up',
    milestone: 'Verify fixes and next steps',
    artifact: 'Retest summary'
  }
];

const faqs = [
  {
    q: 'Are we a good fit?',
    a: 'We work best with teams that can provide a dedicated contact and a safe testing environment. If you need ongoing collaboration and clear reporting, we are likely a match.'
  },
  {
    q: 'How far in advance should we book?',
    a: 'Scheduling 2–4 weeks ahead ensures we can align timelines and assemble the right tooling for your scope.'
  },
  {
    q: 'What if issues are found?',
    a: 'All findings include practical remediation steps. We offer a complimentary retest window for critical fixes.'
  }
];

export default function ServicesPage() {
  return (
    <div className="p-6 space-y-16">
      <Meta />

      <section className="space-y-8">
        <h1 className="text-3xl font-bold">Services</h1>
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((svc) => (
            <div key={svc.title} className="border rounded-lg p-4 bg-white/5">
              <h2 className="text-xl font-semibold mb-2">{svc.title}</h2>
              <p className="mb-2"><strong>Scope:</strong> {svc.scope}</p>
              <p className="mb-2"><strong>Timeline:</strong> {svc.timeline}</p>
              <p><strong>Typical Budget:</strong> {svc.budget}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <h1 className="text-3xl font-bold">Process Overview</h1>
        <ol className="space-y-4 list-decimal list-inside">
          {process.map((step) => (
            <li key={step.phase}>
              <p className="font-semibold">{step.phase} – {step.milestone}</p>
              <p className="text-sm text-gray-300">Artifact: {step.artifact}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-8">
        <h1 className="text-3xl font-bold">Client FAQ</h1>
        <div className="space-y-4">
          {faqs.map((item) => (
            <div key={item.q}>
              <p className="font-semibold">{item.q}</p>
              <p className="text-gray-300">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Next Steps</h1>
        <p>
          Review the services above and confirm your environment and goals. When you’re ready,
          reach out with your scope, desired timeline and any constraints so we can provide a
          precise proposal.
        </p>
      </section>
    </div>
  );
}


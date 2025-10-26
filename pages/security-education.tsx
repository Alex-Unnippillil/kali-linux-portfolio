import React from 'react';
import WorkflowCard from '../components/WorkflowCard';
import WindowMainScreen from '../components/base/WindowMainScreen.server';

interface FrameProps {
  title: string;
  link: string;
  description: string;
}

const InfoFrame = ({ title, link, description }: FrameProps) => (
  <iframe
    title={title}
    sandbox="allow-popups"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture"
    referrerPolicy="no-referrer"
    srcDoc={`<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'></head><body><h2>${title}</h2><p>${description}</p><p><a href='${link}' target='_blank' rel='noopener noreferrer'>Official Documentation</a></p></body></html>`}
    style={{ width: '100%', border: '1px solid #ccc', height: '200px' }}
  />
);

const SecurityEducation = () => (
  <WindowMainScreen
    screen={() => (
      <div>
        <div
          style={{
            backgroundColor: '#fcd34d',
            padding: '1rem',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          Use Kali Linux and related tools legally and ethically with proper authorization.
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <InfoFrame
            title="What"
            link="https://www.kali.org/docs/introduction/what-is-kali-linux/"
            description="Overview of Kali Linux and its purpose."
          />
          <InfoFrame
            title="Why"
            link="https://www.kali.org/docs/introduction/should-i-use-kali-linux/"
            description="Reasons to use Kali Linux for authorized security assessments."
          />
          <InfoFrame
            title="Risks"
            link="https://owasp.org/www-project-top-ten/"
            description="Common security risks highlighted by the OWASP Top Ten."
          />
          <InfoFrame
            title="Defenses"
            link="https://www.cisa.gov/secure-our-world"
            description="CISA guidance on defending against cyber threats."
          />
        </div>
        <div className="p-4">
          <WorkflowCard />
        </div>
      </div>
    )}
  />
);

export default SecurityEducation;


import React, { Component } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import ReactGA from 'react-ga4';
import GitHubStars from '../../GitHubStars';
import Certs from '../certs';
import data from '../alex/data.json';
import { getCspNonce } from '../../../utils/csp';
import AboutSlides from './slides';
import ScrollableTimeline from '../../ScrollableTimeline';

class AboutAlex extends Component<unknown, { screen: React.ReactNode; active_screen: string; navbar: boolean }> {
  screens: Record<string, React.ReactNode> = {};

  constructor(props: unknown) {
    super(props);
    this.state = {
      screen: <></>,
      active_screen: 'about',
      navbar: false,
    };
  }

  componentDidMount() {
    this.screens = {
      about: <About />,
      education: <Education />,
      skills: <Skills skills={data.skills} />,
      certs: <Certs />,
      projects: <Projects projects={data.projects} />,
      resume: <Resume />,
    };

    let lastVisitedScreen = localStorage.getItem('about-section');
    if (!lastVisitedScreen) {
      lastVisitedScreen = 'about';
    }

    this.changeScreen({ id: lastVisitedScreen } as unknown as EventTarget & { id: string });
  }

  changeScreen = (e: any) => {
    const screen = e.id || e.target.id;
    localStorage.setItem('about-section', screen);
    ReactGA.send({ hitType: 'pageview', page: `/${screen}`, title: 'Custom Title' });
    this.setState({ screen: this.screens[screen], active_screen: screen });
  };

  showNavBar = () => {
    this.setState({ navbar: !this.state.navbar });
  };

  renderNavLinks = () => (
    <>
      {data.sections.map((section) => (
        <div
          key={section.id}
          id={section.id}
          role="tab"
          aria-selected={this.state.active_screen === section.id}
          tabIndex={this.state.active_screen === section.id ? 0 : -1}
          onFocus={this.changeScreen}
          className={
            (this.state.active_screen === section.id
              ? ' bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95'
              : ' hover:bg-gray-50 hover:bg-opacity-5 ') +
            ' w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5'
          }
        >
          <Image
            className="w-3 md:w-4 rounded border border-gray-600"
            alt={section.alt}
            src={section.icon}
            width={16}
            height={16}
            sizes="16px"
          />
          <span className=" ml-1 md:ml-2 text-gray-50 ">{section.label}</span>
        </div>
      ))}
    </>
  );

  handleNavKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')
    );
    let index = tabs.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      index = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      index = (index - 1 + tabs.length) % tabs.length;
    } else {
      return;
    }
    tabs.forEach((tab, i) => (tab.tabIndex = i === index ? 0 : -1));
    tabs[index].focus();
  };

  render() {
    const structured = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Alex Unnippillil',
      url: 'https://unnippillil.com',
    };
    const nonce = getCspNonce();

    return (
      <main className="w-full h-full flex bg-ub-cool-grey text-white select-none relative">
        <Head>
          <title>About</title>
          <script
            type="application/ld+json"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
          />
        </Head>
        <div
          className="md:flex hidden flex-col w-1/4 md:w-1/5 text-sm overflow-y-auto windowMainScreen border-r border-black"
          role="tablist"
          aria-orientation="vertical"
          onKeyDown={this.handleNavKeyDown}
        >
          {this.renderNavLinks()}
        </div>
        <div
          onClick={this.showNavBar}
          className="md:hidden flex flex-col items-center justify-center absolute bg-ub-cool-grey rounded w-6 h-6 top-1 left-1"
        >
          <div className=" w-3.5 border-t border-white" />
          <div className=" w-3.5 border-t border-white" style={{ marginTop: '2pt', marginBottom: '2pt' }} />
          <div className=" w-3.5 border-t border-white" />
          <div
            className={
              (this.state.navbar ? ' visible animateShow z-30 ' : ' invisible ') +
              ' md:hidden text-xs absolute bg-ub-cool-grey py-0.5 px-1 rounded-sm top-full mt-1 left-0 shadow border-black border border-opacity-20'
            }
            role="tablist"
            aria-orientation="vertical"
            onKeyDown={this.handleNavKeyDown}
          >
            {this.renderNavLinks()}
          </div>
        </div>
        <div className="flex flex-col w-3/4 md:w-4/5 justify-start items-center flex-grow bg-ub-grey overflow-y-auto windowMainScreen">
          {this.state.screen}
        </div>
      </main>
    );
  }
}

export default function AboutApp() {
  return (
    <>
      <AboutAlex />
      <AboutSlides />
    </>
  );
}

export { default as SafetyNote } from './SafetyNote';

function About() {
  return (
    <article className="terminal">
      <header className="titlebar">
        <span className="winbtn close"></span>
        <span className="winbtn min"></span>
        <span className="winbtn max"></span>
        <strong>user@portfolio:~</strong>
      </header>
      <pre className="screen">
        {`$ whoami\nAlex Unnippillil\n$ echo "Cybersecurity Specialist passionate about technology."`}
      </pre>
    </article>
  );
}

const workerApps = [
  { id: 'hydra', label: 'Hydra' },
  { id: 'john', label: 'John the Ripper' },
  { id: 'metasploit', label: 'Metasploit' },
  { id: 'mimikatz', label: 'Mimikatz' },
  { id: 'radare2', label: 'Radare2' },
];

function WorkerStatus() {
  const [status, setStatus] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    workerApps.forEach((app) => {
      fetch(`/api/${app.id}`, { method: 'HEAD' })
        .then((res) => {
          setStatus((s) => ({ ...s, [app.id]: res.status < 500 ? 'Online' : 'Offline' }));
        })
        .catch(() => {
          setStatus((s) => ({ ...s, [app.id]: 'Offline' }));
        });
    });
  }, []);

  return (
    <section aria-labelledby="app-status-heading" className="mt-8 w-5/6 md:w-3/4">
      <h2 id="app-status-heading" className="text-lg font-bold text-center">
        Worker App Availability
      </h2>
      <ul role="list" className="mt-2">
        {workerApps.map((app) => (
          <li key={app.id} className="flex justify-between items-center py-1 border-b border-gray-600">
            <span className="capitalize">{app.label}</span>
            <span aria-live="polite">{status[app.id] || 'Checking...'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Timeline() {
  return (
    <div className="w-5/6 md:w-1/2 mt-8">
      <ScrollableTimeline />
      <div className="no-print mt-4 text-right">
        <a
          href="/assets/timeline.pdf"
          download
          className="px-2 py-1 rounded bg-ub-gedit-light text-sm"
        >
          Download Timeline PDF
        </a>
      </div>
    </div>
  );
}

function Education() {
  return (
    <>
      <div className=" font-medium relative text-2xl mt-2 md:mt-4 mb-4">
        Education
        <div className="absolute pt-px bg-white mt-px top-full w-full">
          <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 left-full" />
          <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 right-full" />
        </div>
      </div>
      <ul className=" w-10/12  mt-4 ml-4 px-0 md:px-1">
        <li className="list-disc mt-5">
          <div className=" text-lg md:text-xl text-left font-bold leading-tight">Ontario Tech University</div>
          <div className=" text-sm text-gray-400 mt-0.5">2020 - 2024</div>
          <div className=" text-sm md:text-base">Networking and Information Technology Security</div>
          <div className="text-sm text-gray-300 font-bold mt-1"> </div>
        </li>
        <li className="list-disc mt-5">
          <div className=" text-lg md:text-xl text-left font-bold leading-tight">Ontario Tech University</div>
          <div className=" text-sm text-gray-400 mt-0.5">2012 - 2016</div>
          <div className=" text-sm md:text-base">Nuclear Engineering</div>
          <div className="text-sm text-gray-300 font-bold mt-1" />
        </li>
        <li className="list-disc mt-5">
          <div className=" text-lg md:text-xl text-left font-bold leading-tight">St. John Paul II Catholic Secondary School</div>
          <div className=" text-sm text-gray-400 mt-0.5">2008 - 2012</div>
          <div className=" text-sm md:text-base"> </div>
          <div className="text-sm text-gray-300 font-bold mt-1"> </div>
        </li>
      </ul>
    </>
  );
}

const SkillSection = ({ title, badges }: { title: string; badges: { src: string; alt: string; description: string }[] }) => {
  const [filter, setFilter] = React.useState('');
  const [selected, setSelected] = React.useState<any>(null);
  const filteredBadges = badges.filter((b) => b.alt.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="px-2 w-full">
      <div className="text-sm text-center md:text-base font-bold">{title}</div>
      <input
        type="text"
        placeholder="Filter..."
        className="mt-2 w-full px-2 py-1 rounded text-black"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="flex flex-wrap justify-center items-start w-full mt-2">
        {filteredBadges.map((badge) => (
          <img
            key={badge.alt}
            className="m-1 cursor-pointer"
            src={badge.src}
            alt={badge.alt}
            title={badge.description}
            onClick={() => setSelected(badge)}
          />
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" onClick={() => setSelected(null)}>
          <div className="bg-ub-cool-grey p-4 rounded max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold mb-2 text-center">{selected.alt}</div>
            <p className="text-sm text-center">{selected.description}</p>
            <button className="mt-2 px-2 py-1 bg-ubt-blue rounded" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function Skills({ skills }: { skills: any }) {
  const { networkingSecurity, softwaresOperating, languagesTools, frameworksLibraries } = skills;
  return (
    <>
      <div className=" font-medium relative text-2xl mt-2 md:mt-4 mb-4">
        Technical Skills
        <div className="absolute pt-px bg-white mt-px top-full w-full">
          <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 left-full" />
          <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 right-full" />
        </div>
      </div>
      <ul className=" tracking-tight text-sm md:text-base w-10/12 emoji-list">
        <li className=" list-arrow text-sm md:text-base mt-4 leading-tight tracking-tight">
          <div>
            I&apos;ve learned a variety of programming languages and frameworks while{' '}
            <strong className="text-ubt-gedit-blue">specializing in network security</strong>
          </div>
        </li>
        <li className=" list-arrow text-sm md:text-base mt-4 leading-tight tracking-tight">
          <div>Below are some skills I&apos;ve learned over the years</div>
        </li>
      </ul>
      <div className="w-full md:w-10/12 grid grid-cols-1 md:grid-cols-2 mt-4 gap-4">
        <SkillSection title="Networking & Security" badges={networkingSecurity} />
        <SkillSection title="Softwares & Operating Systems" badges={softwaresOperating} />
        <SkillSection title="Languages & Tools" badges={languagesTools} />
        <SkillSection title="Frameworks & Libraries" badges={frameworksLibraries} />
      </div>
      <div className="w-full md:w-10/12 flex flex-col items-center mt-8">
        <div className="font-bold text-sm md:text-base mb-2 text-center">GitHub Contributions</div>
        <GitHubStars user="alex-unnippillil" repo="kali-linux-portfolio" />
      </div>
    </>
  );
}

function Projects({ projects }: { projects: any[] }) {
  return (
    <>
      <div className=" font-medium relative text-2xl mt-2 md:mt-4 mb-4">
        Projects
      </div>
      {projects.map((project) => (
        <article key={project.link} className="terminal mb-4">
          <header className="titlebar">
            <span className="winbtn close"></span>
            <span className="winbtn min"></span>
            <span className="winbtn max"></span>
            <strong>user@portfolio:~/projects</strong>
          </header>
          <pre className="screen">
            {`$ ${project.name}\n${project.description.join('\n')}`}
          </pre>
        </article>
      ))}
    </>
  );
}

function Resume() {
  const handleDownload = () => {
    ReactGA.event({ category: 'resume', action: 'download' });
  };

  const shareContact = async () => {
    const vcardUrl = '/assets/alex-unnippillil.vcf';
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Alex Unnippillil Contact',
          url: window.location.origin + vcardUrl,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      window.location.href = vcardUrl;
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-2 text-right no-print space-x-2">
        <a
          href="/assets/Alex-Unnippillil-Resume.pdf"
          download
          onClick={handleDownload}
          className="px-2 py-1 rounded bg-ub-gedit-light text-sm"
        >
          Download
        </a>
        <a href="/assets/alex-unnippillil.vcf" download className="px-2 py-1 rounded bg-ub-gedit-light text-sm">
          vCard
        </a>
        <button onClick={shareContact} className="px-2 py-1 rounded bg-ub-gedit-light text-sm">
          Share contact
        </button>
      </div>
      <object className="h-full w-full flex-1" data="/assets/Alex-Unnippillil-Resume.pdf" type="application/pdf">
        <p className="p-4 text-center">
          Unable to display PDF.&nbsp;
          <a
            href="/assets/Alex-Unnippillil-Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-ubt-blue"
            onClick={handleDownload}
          >
            Download the resume
          </a>
        </p>
      </object>
    </div>
  );
}


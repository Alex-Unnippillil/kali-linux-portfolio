import React, { Component } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import LazyGitHubButton from '../LazyGitHubButton';
import LazyImage from '../LazyImage';
import Certs from './certs';

export class AboutAlex extends Component {

    constructor() {
        super();
        this.screens = {};
        this.state = {
            screen: () => { },
            active_screen: "about", // by default 'about' screen is active
            navbar: false,
        }
    }

    componentDidMount() {
        this.screens = {
            "about": <About />,
            "education": <Education />,
            "skills": <Skills />,
            "certs": <Certs />,
            "projects": <Projects />,
            "resume": <Resume />,
        }

        let lastVisitedScreen = localStorage.getItem("about-section");
        if (lastVisitedScreen === null || lastVisitedScreen === undefined) {
            lastVisitedScreen = "about";
        }

        // focus last visited screen
        this.changeScreen(document.getElementById(lastVisitedScreen));
    }

    changeScreen = (e) => {
        const screen = e.id || e.target.id;

        // store this state
        localStorage.setItem("about-section", screen);

        // google analytics
        ReactGA.send({ hitType: "pageview", page: `/${screen}`, title: "Custom Title" });


        this.setState({
            screen: this.screens[screen],
            active_screen: screen
        });
    }

    showNavBar = () => {
        this.setState({ navbar: !this.state.navbar });
    }

    renderNavLinks = () => {
        return (
            <>
                <div id="about" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "about" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <Image
                        className=" w-3 md:w-4"
                        alt="about Unnippillil"
                        src="/themes/Yaru/status/about.svg"
                        width={16}
                        height={16}
                        sizes="16px"
                    />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">About Me</span>
                </div>
                <div id="education" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "education" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <Image
                        className=" w-3 md:w-4"
                        alt="Unnippillil' education"
                        src="/themes/Yaru/status/education.svg"
                        width={16}
                        height={16}
                        sizes="16px"
                    />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">Education</span>
                </div>
                <div id="skills" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "skills" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <Image
                        className=" w-3 md:w-4"
                        alt="Unnippillil' skills"
                        src="/themes/Yaru/status/skills.svg"
                        width={16}
                        height={16}
                        sizes="16px"
                    />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">Skills</span>
                </div>
                <div id="certs" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "certs" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <Image
                        className=" w-3 md:w-4"
                        alt="Unnippillil's certifications"
                        src="/themes/Yaru/status/experience.svg"
                        width={16}
                        height={16}
                        sizes="16px"
                    />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">Certs</span>
                </div>
                <div id="projects" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "projects" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <Image
                        className=" w-3 md:w-4"
                        alt="Unnippillil' projects"
                        src="/themes/Yaru/status/projects.svg"
                        width={16}
                        height={16}
                        sizes="16px"
                    />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">Projects</span>
                </div>
                <div id="resume" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "resume" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <Image
                        className=" w-3 md:w-4"
                        alt="Unnippillil's resume"
                        src="/themes/Yaru/status/download.svg"
                        width={16}
                        height={16}
                        sizes="16px"
                    />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">Resume</span>
                </div>

            </>
        );
    }

    render() {
        return (
            <div className="w-full h-full flex bg-ub-cool-grey text-white select-none relative">
                <div className="md:flex hidden flex-col w-1/4 md:w-1/5 text-sm overflow-y-auto windowMainScreen border-r border-black">
                    {this.renderNavLinks()}
                </div>
                <div onClick={this.showNavBar} className="md:hidden flex flex-col items-center justify-center absolute bg-ub-cool-grey rounded w-6 h-6 top-1 left-1">
                    <div className=" w-3.5 border-t border-white"></div>
                    <div className=" w-3.5 border-t border-white" style={{ marginTop: "2pt", marginBottom: "2pt" }}></div>
                    <div className=" w-3.5 border-t border-white"></div>
                    <div className={(this.state.navbar ? " visible animateShow z-30 " : " invisible ") + " md:hidden text-xs absolute bg-ub-cool-grey py-0.5 px-1 rounded-sm top-full mt-1 left-0 shadow border-black border border-opacity-20"}>
                        {this.renderNavLinks()}
                    </div>
                </div>
                <div className="flex flex-col w-3/4 md:w-4/5 justify-start items-center flex-grow bg-ub-grey overflow-y-auto windowMainScreen">
                    {this.state.screen}
                </div>
            </div>
        );
    }
}

export default AboutAlex;

export const displayAboutAlex = () => {
    return <AboutAlex />;
}


function About() {
    return (
        <>
            <div className="w-20 md:w-28 my-4 full">
                <Image
                    className="w-full"
                    src="/images/logos/bitmoji.png"
                    alt="Alex Unnippillil Logo"
                    width={256}
                    height={256}
                    sizes="(max-width: 768px) 50vw, 25vw"
                    priority
                />
            </div>
            <div className=" mt-4 md:mt-8 text-lg md:text-2xl text-center px-1">
                <div>My name is <span className="font-bold">Alex Unnippillil</span>, </div>
                 <div className="font-normal ml-1">I&apos;m a <span className="text-ubt-blue font-bold"> Cybersecurity Specialist!</span></div>
            </div>
            <div className=" mt-4 relative md:my-8 pt-px bg-white w-32 md:w-48">
                <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 left-0"></div>
                <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 right-0"></div>
            </div>
            <ul className=" mt-4 leading-tight tracking-tight text-sm md:text-base w-5/6 md:w-3/4 emoji-list">
                 <li className=" list-pc">I&apos;m a <span className=" font-medium"> Technology Enthusiast </span> who thrives on the thrill of learning and mastering the rapidly evolving world of tech. I&apos;ve completed 4 years of a degree in <u className=' cursor-pointer '><a href="https://shared.ontariotechu.ca/shared/faculty/fesns/documents/FESNS%20Program%20Maps/2018_nuclear_engineering_map_2017_entry.pdf" target={"_blank"}>Nuclear Engineering </a></u> at OntarioTech University before, I decided to my change my career goals to and pursue my passion of <u className=' cursor-pointer '> <a href="https://businessandit.ontariotechu.ca/undergraduate/bachelor-of-information-technology/networking-and-information-technology-security/networking-and-i.t-security-bit-2023-2024_.pdf" target={"_blank"}> Networking and I.T. Security</a> </u>.</li>
                 <li className=" mt-3 list-building">  If you&apos;re looking for the type of person that always wants to help others. That&apos;ll be there putting in the work 24/7. Please feel free to send an email <a className='text-underline'
                               href='mailto:alex.unnippillil@hotmail.com'><u>@alex.unnippillil@hotmail.com</u></a></li>
                <li className=" mt-3 list-time"> When I am not learning my next technical skill, I like to spend my time reading books, rock climbing or watching <u className=' cursor-pointer '><a href="https://www.youtube.com/@Alex-Unnippillil/playlists" target={"_blank"}>Youtube Videos</a></u> and <u className=' cursor-pointer '><a href="https://myanimelist.net/animelist/alex_u" target={"_blank"}>Anime</a></u></li> 
                <li className=" mt-3 list-star"> And I also have interests in Deep Learning, Software Development & Animation!</li>
            </ul>
        </>
    )
}
function Education() {
    return (
        <>
            <div className=" font-medium relative text-2xl mt-2 md:mt-4 mb-4">
                Education
                <div className="absolute pt-px bg-white mt-px top-full w-full">
                    <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 left-full"></div>
                    <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 right-full"></div>
                </div>
            </div>
            <ul className=" w-10/12  mt-4 ml-4 px-0 md:px-1">
                <li className="list-disc mt-5">
                    <div className=" text-lg md:text-xl text-left font-bold leading-tight">
                        Ontario Tech University
                    </div>
                    <div className=" text-sm text-gray-400 mt-0.5">2020 - 2024</div>
                    <div className=" text-sm md:text-base">Networking and Information Technology Security</div>
                    <div className="text-sm text-gray-300 font-bold mt-1"> </div>
                </li>
                <li className="list-disc mt-5">
                    <div className=" text-lg md:text-xl text-left font-bold leading-tight">
                    Ontario Tech University
                    </div>
                    <div className=" text-sm text-gray-400 mt-0.5">2012 - 2016</div>
                    <div className=" text-sm md:text-base">Nuclear Engineering</div>
                    <div className="text-sm text-gray-300 font-bold mt-1"></div>
                </li>
                <li className="list-disc mt-5">
                    <div className=" text-lg md:text-xl text-left font-bold leading-tight">
                    St. John Paul II Catholic Secondary School
                    </div>
                    <div className=" text-sm text-gray-400 mt-0.5">2008 - 2012</div>
                    <div className=" text-sm md:text-base">  </div>
                    <div className="text-sm text-gray-300 font-bold mt-1"> </div>
                </li>
            </ul>
        </>
    )
}
const SkillSection = ({ title, badges }) => {
  const [filter, setFilter] = React.useState('');
  const [selected, setSelected] = React.useState(null);

  const filteredBadges = badges.filter(b =>
    b.alt.toLowerCase().includes(filter.toLowerCase())
  );

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
        {filteredBadges.map(badge => (
          <LazyImage
            key={badge.alt}
            className="m-1 cursor-pointer"
            src={badge.src}
            srcSet={`${badge.src} 1x, ${badge.src} 2x`}
            sizes="(max-width: 768px) 20vw, 10vw"
            alt={badge.alt}
            title={badge.description}
            onClick={() => setSelected(badge)}
          />
        ))}
      </div>
      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-ub-cool-grey p-4 rounded max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold mb-2 text-center">{selected.alt}</div>
            <p className="text-sm text-center">{selected.description}</p>
            <button
              className="mt-2 px-2 py-1 bg-ubt-blue rounded"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function Skills() {
  const networkingSecurity = [
    { src: 'https://img.shields.io/badge/AWS-%23FF9900.svg?logo=amazon-aws&logoColor=white', alt: 'AWS', description: 'Amazon Web Services' },
    { src: 'https://img.shields.io/badge/Azure-%230072C6.svg?logo=microsoftazure&logoColor=white', alt: 'Azure', description: 'Microsoft Azure' },
    { src: 'https://img.shields.io/badge/Windows_Server-0078D6?logo=windows', alt: 'Windows Server', description: 'Windows Server Administration' },
    { src: 'https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff', alt: 'Docker', description: 'Container Platform' },
    { src: 'https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=fff', alt: 'Kubernetes', description: 'Container Orchestration' },
    { src: 'https://img.shields.io/badge/Tor-7D4698?logo=Tor-Browser&logoColor=white', alt: 'Tor', description: 'Anonymity Network' },
    { src: 'https://img.shields.io/badge/CCNA-007ACC?logo=Cisco&logoColor=fff', alt: 'CCNA', description: 'Cisco Certified Network Associate' },
    { src: 'https://img.shields.io/badge/CCNP-007ACC?logo=Cisco&logoColor=fff', alt: 'CCNP', description: 'Cisco Certified Network Professional' },
    { src: 'https://img.shields.io/badge/PuTTY-7D4698?logo=gnometerminal&logoColor=white', alt: 'PuTTY', description: 'SSH Client' },
    { src: 'https://img.shields.io/badge/Wireshark-%230072C6.svg?logo=wireshark&logoColor=white', alt: 'Wireshark', description: 'Network Analyzer' },
    { src: 'https://img.shields.io/badge/OWASP-black?style=flat&logo=OWASP&logoColor=ffffff', alt: 'OWASP', description: 'Open Web Application Security Project' },
    { src: 'https://img.shields.io/badge/Nmap-4682B4?logo=nmap&logoColor=white', alt: 'Nmap', description: 'Network Scanner' },
    { src: 'https://img.shields.io/badge/Metasploit-1280c4?logo=metasploit&logoColor=white', alt: 'Metasploit', description: 'Penetration Testing Framework' },
    { src: 'https://img.shields.io/badge/Burp_Suite-FF6633?logo=burp-suite&logoColor=white', alt: 'Burp Suite', description: 'Web Vulnerability Scanner' },
    { src: 'https://img.shields.io/badge/Splunk-000000?logo=splunk&logoColor=white', alt: 'Splunk', description: 'Security Information and Event Management' }
  ];

  const softwaresOperating = [
    { src: 'https://img.shields.io/badge/PowerShell-%235391FE.svg?logo=powershell&logoColor=white', alt: 'PowerShell', description: 'Automation Shell' },
    { src: 'https://img.shields.io/badge/-VMware-FFCA28?style=flat&logo=vmware&logoColor=ffffff', alt: 'VMware', description: 'Virtualization Platform' },
    { src: 'https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white', alt: 'Windows', description: 'Windows OS' },
    { src: 'https://img.shields.io/badge/Kali%20Linux-557C94?logo=kalilinux&logoColor=fff', alt: 'Kali Linux', description: 'Penetration Testing Distribution' },
    { src: 'https://img.shields.io/badge/Fedora-51A2DA?logo=fedora&logoColor=fff', alt: 'Fedora', description: 'Fedora Linux' },
    { src: 'https://img.shields.io/badge/macOS-000000?logo=macos&logoColor=F0F0F0', alt: 'macOS', description: 'Apple Operating System' },
    { src: 'https://img.shields.io/badge/PyCharm-143?logo=pycharm&logoColor=black&color=black&labelColor=green', alt: 'PyCharm', description: 'Python IDE' },
    { src: 'https://img.shields.io/badge/Unity-%23000000.svg?logo=unity&logoColor=white', alt: 'Unity', description: 'Game Engine' },
    { src: 'https://img.shields.io/badge/Xcode-007ACC?logo=Xcode&logoColor=white', alt: 'Xcode', description: 'Apple IDE' },
    { src: 'https://img.shields.io/badge/Android%20Studio-3DDC84?logo=android-studio&logoColor=white', alt: 'Android Studio', description: 'Android IDE' },
    { src: 'https://img.shields.io/badge/Ubuntu-E95420?logo=ubuntu&logoColor=white', alt: 'Ubuntu', description: 'Ubuntu Linux' },
    { src: 'https://img.shields.io/badge/Debian-D70A53?logo=debian&logoColor=white', alt: 'Debian', description: 'Debian Linux' },
    { src: 'https://img.shields.io/badge/Visual%20Studio-5C2D91?logo=visual-studio&logoColor=white', alt: 'Visual Studio', description: 'Microsoft IDE' },
    { src: 'https://img.shields.io/badge/VS%20Code-007ACC?logo=visual-studio-code&logoColor=white', alt: 'VS Code', description: 'Code Editor' },
    { src: 'https://img.shields.io/badge/Git-F05032?logo=git&logoColor=white', alt: 'Git', description: 'Version Control' }
  ];

  const languagesTools = [
    { src: 'https://img.shields.io/badge/-JavaScript-%23F7DF1C?style=flat&logo=javascript&logoColor=000000&labelColor=%23F7DF1C&color=%23FFCE5A', alt: 'JavaScript', description: 'Scripting Language' },
    { src: 'https://img.shields.io/badge/C%2B%2B-00599C?style=flat&logo=c%2B%2B&logoColor=white', alt: 'C++', description: 'Systems Programming Language' },
    { src: 'https://img.shields.io/badge/-Python-3776AB?style=flat&logo=python&logoColor=ffffff', alt: 'Python', description: 'General Purpose Language' },
    { src: 'https://img.shields.io/badge/Dart-0175C2?style=flat&logo=dart&logoColor=white', alt: 'Dart', description: 'Dart Language' },
    { src: 'https://img.shields.io/badge/-HTML5-%23E44D27?style=flat&logo=html5&logoColor=ffffff', alt: 'HTML5', description: 'Markup Language' },
    { src: 'https://img.shields.io/badge/CSS-1572B6?logo=css3&logoColor=fff', alt: 'CSS', description: 'Stylesheet Language' },
    { src: 'https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=fff', alt: 'MySQL', description: 'Relational Database' },
    { src: 'https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white', alt: 'Java', description: 'Java Programming Language' },
    { src: 'https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white', alt: 'TypeScript', description: 'Typed JavaScript' },
    { src: 'https://img.shields.io/badge/Go-00ADD8?logo=go&logoColor=white', alt: 'Go', description: 'Go Programming Language' },
    { src: 'https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white', alt: 'Rust', description: 'Rust Programming Language' },
    { src: 'https://img.shields.io/badge/Bash-121011?logo=gnubash&logoColor=white', alt: 'Bash', description: 'Unix Shell' }
  ];

  const frameworksLibraries = [
    { src: 'https://img.shields.io/badge/Next-black?style=flat&logo=next.js&logoColor=ffffff', alt: 'Next.js', description: 'React Framework' },
    { src: 'https://img.shields.io/badge/-React-61DAFB?style=flat&logo=react&logoColor=ffffff', alt: 'React', description: 'UI Library' },
    { src: 'https://img.shields.io/badge/Flutter-02569B?style=flat&logo=flutter&logoColor=white', alt: 'Flutter', description: 'UI Toolkit' },
    { src: 'https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white', alt: 'Tailwind CSS', description: 'Utility-first CSS' },
    { src: 'https://img.shields.io/badge/-Nodejs-339933?style=flat&logo=Node.js&logoColor=ffffff', alt: 'Node.js', description: 'JavaScript Runtime' },
    { src: 'https://img.shields.io/badge/jQuery-0769AD?style=flat&logo=jquery&logoColor=white', alt: 'jQuery', description: 'JavaScript Library' },
    { src: 'https://img.shields.io/badge/Hydrogen-7AB55C?logo=shopify&logoColor=fff', alt: 'Hydrogen', description: 'Shopify Framework' },
    { src: 'https://img.shields.io/badge/NIST-black?style=flat&logo=netapp&logoColor=ffffff', alt: 'NIST', description: 'Cybersecurity Framework' },
    { src: 'https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white', alt: 'Express.js', description: 'Web Framework' },
    { src: 'https://img.shields.io/badge/Django-092E20?logo=django&logoColor=white', alt: 'Django', description: 'Python Framework' },
    { src: 'https://img.shields.io/badge/Bootstrap-7952B3?logo=bootstrap&logoColor=white', alt: 'Bootstrap', description: 'CSS Framework' },
    { src: 'https://img.shields.io/badge/Redux-764ABC?logo=redux&logoColor=white', alt: 'Redux', description: 'State Management Library' },
    { src: 'https://img.shields.io/badge/TensorFlow-FF6F00?logo=tensorflow&logoColor=white', alt: 'TensorFlow', description: 'Machine Learning Library' }
  ];

  return (
    <>
      <div className=" font-medium relative text-2xl mt-2 md:mt-4 mb-4">
        Technical Skills
        <div className="absolute pt-px bg-white mt-px top-full w-full">
          <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 left-full"></div>
          <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 right-full"></div>
        </div>
      </div>
      <ul className=" tracking-tight text-sm md:text-base w-10/12 emoji-list">
        <li className=" list-arrow text-sm md:text-base mt-4 leading-tight tracking-tight">
          <div>I&apos;ve learned a variety of programming languages and frameworks while <strong className="text-ubt-gedit-blue">specializing in network security</strong></div>
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
          <div className="bg-ub-gedit-light bg-opacity-20 p-1 md:p-2 rounded-md shadow-md">
            <LazyImage
              src="https://ghchart.rshah.org/Alex-Unnippillil"
              srcSet="https://ghchart.rshah.org/Alex-Unnippillil 1x, https://ghchart.rshah.org/Alex-Unnippillil 2x"
              sizes="(max-width: 768px) 90vw, 600px"
              alt="Alex Unnippillil's GitHub contribution graph"
              className="w-full rounded"
            />
          </div>
        </div>

    </>
  )
}
function Projects() {
    const project_list = [
        {
            name: "Text-Encryption-Decryption-AES-PKCS7",
            date: "Sep 2023",
            link: "https://github.com/Alex-Unnippillil/Text-Encryption-Decryption-AES-PKCS7",
            description: [
                "Text File Encryption/Decryption using AES with PKCS7 Padding in Python",
            ],
            domains: ["python"]
        },
        {
            name: "Password Generator",
            date: "Jun 2023",
            link: "https://github.com/Alex-Unnippillil/PasswordGenerator.py",
            description: [
                "Password Generator password tick menu of numbers, lowecase, uppercase and/or special characters strength of password metre",
            ],
            domains: ["python"]
        },
        {
            name: "Encryption-Mode-Time-Comparison",
            date: "Jun 2023",
            link: "https://github.com/Alex-Unnippillil/encryption-mode-time-comparison",
            description: [
                "Time the encryption of the same large file using ECB, CBC, CFB, OFB, CTR, and XTS-AES. Compare and rationalize the outcome.",
            ],
        },
        {
            name: "Cyber Secuirty Dictionary",
            date: "Sep 2023",
            link: "https://github.com/Alex-Unnippillil/CyberSecuirtyDictionary",
            description: [
                "a dictionary of cyber security terms and their definitions",
            ],
            domains: ["javascript"]
        },
        {
            name: "Cryptography-Transposition-Substitution-RSA-Product-Caesar-Playfair Cryptography Final Project",
            date: "Apr 2021",
            link: "https://github.com/Alex-Unnippillil/Cryptography-Transposition-Substitution-RSA-Product-Caesar-Playfair",
            description: [
                "An encryption algorithm designed that was difficult to decipher by our classmates. The algorithm uses Transposition and Substitution ,RSA and Product, Caesar and Playfair",
            ],
            domains: ["python"]
        },
        {
            name: "Text Translator",
            date: "Jun 2023",
            link: "https://github.com/Alex-Unnippillil/text-translator",
            description: [
                "text-translator utialitzes the googletrans library to translate text from one language to another",
            ],
            domains: ["python"]
        },
        {
            name: "Calc.py",
            date: "Jun 2023",
            link: "https://github.com/Alex-Unnippillil/Calc.py",
            description: [
                "Calc.py is a simple calculator that utilizes matplotlib and numpy to provide visualization",
            ],
            domains: ["python"]
        },
        {
            name: "AES-Encrypt-Decrypt",
            date: "Sep 2023",
            link: "https://github.com/Alex-Unnippillil/AES-Encrypt-Decrypt",
            description: [
                "AES encryption algortihm utilizes the cryptopp library",
            ],
            domains: ["c++"]
        },
        {
            name: "image scrapper/downloader",
            date: "Apr 2023",
            link: "https://github.com/Alex-Unnippillil/imagedownloader",
            description: [
                "download the images from a website",
            ],
            domains: ["python"]
        },
        {
            name: "Binary Search",
            date: "Apr 2023",
            link: "https://github.com/Alex-Unnippillil/BinarySearch",
            description: [
                "Binary Search w/ check sort, find min/max",
            ],
            domains: ["c++"]
        },
        {
            name: "AES-Python",
            date: "Apr 2023",
            link: "https://github.com/Alex-Unnippillil/AES-Python",
            description: [
                "AES encryption / decryption utilizing cryptography.fernet in python",
            ],
            domains: ["python"]
        },
        {
            name: "Generate-Random-Password.cpp",
            date: "Apr 2023",
            link: "https://github.com/Alex-Unnippillil/GenerateRandomPassword",
            description: [
                "Generate a random password at a desired character length.",
            ],
            domains: ["c++"]
        },
        {
            name: "caesar-cipher",
            date: "Apr 2023",
            link: "https://github.com/Alex-Unnippillil/caesar-cipher",
            description: [
                "a simple python script that allows you to encrypt, decrypt and brute force strings",
            ],
            domains: ["python"]
        },
        {
            name: "Art-Generator",
            date: "Apr 2023",
            link: "https://github.com/Alex-Unnippillil/ArtGenerator",
            description: [
                "a art generator created in python and javascript",
            ],
            domains: ["python","javascript"]
        },
        {
            name: "10 Web Game Selection",
            date: "Mar 2023",
            link: "https://github.com/Alex-Unnippillil/WebGameSelectionn",
            description: [
                "Guess Number, Even/Odd, Higher/Lower, Color Guess, Rock Paper Scissors, Tic Tac Toe, Dice Roll, Coin Toss, NumberMemory, Word Jumble,Anagram",
            ],
            domains: ["javascript", "html5", "css"]
        },
        {
            name: "space invader",
            date: "Mar 2023",
            link: "https://github.com/Alex-Unnippillil/space-invader",
            description: ["js space invader"
            ],
            domains: ["javascript", "html5", "css"]
        },
        {
            name: "Snake-Game.py",
            date: "Mar 2023",
            link: "https://github.com/Alex-Unnippillil/SnakeGame.py",
            description: ["snake using the turtle, time, random pkgs"
            ],
            domains: ["python"]
        },
        {
            name: "guess the number",
            date: "Mar 2023",
            link: "https://github.com/Alex-Unnippillil/guess-the-number",
            description: ["Guess the number between 1 and 100"
            ],
            domains: ["html5"]
        },
        {
            name: "Colour-Matching-Game.py",
            date: "Mar 2023",
            link: "https://github.com/Alex-Unnippillil/ColourMatchingGame.py",
            description: ["selecting the colours and unlock a new highscore!"
            ],
            domains: ["python"]
        },
        {
            name: "function.py",
            date: "Jun 2023",
            link: "https://github.com/Alex-Unnippillil/function.py",
            description: [
                "59 Functions in Python",
            ],
            domains: ["python"]
        },
        {
            name: "Reaction Test Game",
            date: "Mar 2021",
            link: "https://github.com/Alex-Unnippillil/reaction-test-game",
            description: [
                "Reaction Test Game",
            ],
            domains: ["javascript", "css", "html5"]
        },
        {
            name: "Hangman.py",
            date: "Aug 2023",
            link: "https://github.com/Alex-Unnippillil/hangman.py",
            description: [
                "A simple hangman game in python",
            ],
            domains: ["python"]
        },
        {
            name: "tictactoe",
            date: "Jun 2023",
            link: "https://github.com/Alex-Unnippillil/tictactoe",
            description: [
                "Tic Tac Toe Game in 100% HTML",
            ],
            domains: ["html5"]
        },
        {
            name: "test-blockchain",
            date: "Apr 2023",
            link: "https://github.com/Alex-Unnippillil/test-blockchain",
            description: [
                "simple blockchain iteration",
            ],
            domains: ["python"]
        },
        {
            name: "Population-of-Canadian-Provinces ",
            date: "Feb 2024",
            link: "https://github.com/Alex-Unnippillil/Population-of-Canadian-Provinces",
            description: [
                "using statcan population data from 1950s-2024 to get the population of canadian provinces and present it in a race bar graph website",
            ],
            domains: ["html5"]
        }
    ];

    const tag_colors = {
        "javascript": "yellow-300",
        "firebase": "red-600",
        "firestore": "red-500",
        "firebase auth": "red-400",
        "chrome-extension": "yellow-400",
        "flutter": "blue-400",
        "dart": "blue-500",
        "react-native": "purple-500",
        "html5": "yellow-300",
        "sass": "pink-400",
        "tensorflow": "yellow-600",
        "django": "green-600",
        "python": "green-200",
        "codeforces-api": "gray-300",
        "tailwindcss": "blue-300",
        "next.js": "purple-600"
    }

    return (
        <>
            <div className=" font-medium relative text-2xl mt-2 md:mt-4 mb-4">
                Projects
                <div className="absolute pt-px bg-white mt-px top-full w-full">
                    <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 left-full"></div>
                    <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 right-full"></div>
                </div>
            </div>


            {
                project_list.map((project, index) => {
                    const projectNameFromLink = project.link.split('/')
                    const projectName = projectNameFromLink[projectNameFromLink.length - 1]
                    return (
                        <a key={index} href={project.link} target="_blank" rel="noopener noreferrer" className="flex w-full flex-col px-4">
                            <div className="w-full py-1 px-2 my-2 border border-gray-50 border-opacity-10 rounded hover:bg-gray-50 hover:bg-opacity-5 cursor-pointer">
                                <div className="flex flex-wrap justify-between items-center">
                                    <div className='flex justify-center items-center'>
                                        <div className=" text-base md:text-lg mr-2">{project.name.toLowerCase()}</div>
                                        <LazyGitHubButton user="alex-unnippillil" repo={projectName} />
                                    </div>
                                    <div className="text-gray-300 font-light text-sm">{project.date}</div>
                                </div>
                                <ul className=" tracking-normal leading-tight text-sm font-light ml-4 mt-1">
                                    {
                                        project.description.map((desc, index) => {
                                            return <li key={index} className="list-disc mt-1 text-gray-100">{desc}</li>;
                                        })
                                    }
                                </ul>
                                <div className="flex flex-wrap items-start justify-start text-xs py-2">
                                    {
                                        (project.domains ?
                                            project.domains.map((domain, index) => {
                                                const borderColorClass = `border-${tag_colors[domain]}`
                                                const textColorClass = `text-${tag_colors[domain]}`

                                                return <span key={index} className={`px-1.5 py-0.5 w-max border ${borderColorClass} ${textColorClass} m-1 rounded-full`}>{domain}</span>
                                            })

                                            : null)
                                    }
                                </div>
                            </div>
                        </a>
                    )
                })
            }
        </>
    )
}
function Resume() {
    return (
        <object className="h-full w-full" data="/files/Alex-Unnippillil-Resume.pdf" type="application/pdf">
            <p className="p-4 text-center">
                Unable to display PDF.&nbsp;
                <a
                    href="/files/Alex-Unnippillil-Resume.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-ubt-blue"
                >
                    Download the resume
                </a>
            </p>
        </object>
    )
}

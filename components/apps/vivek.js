import React, { Component } from 'react';
import ReactGA from 'react-ga4';

export class AboutVivek extends Component {

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
                    <img className=" w-3 md:w-4" alt="about Unnippillil" src="./themes/Yaru/status/about.svg" />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">About Me</span>
                </div>
                <div id="education" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "education" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <img className=" w-3 md:w-4" alt="Unnippillil' education" src="./themes/Yaru/status/education.svg" />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">Education</span>
                </div>
                <div id="skills" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "skills" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <img className=" w-3 md:w-4" alt="Unnippillil' skills" src="./themes/Yaru/status/skills.svg" />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">Skills</span>
                </div>
                <div id="projects" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "projects" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <img className=" w-3 md:w-4" alt="Unnippillil' projects" src="./themes/Yaru/status/projects.svg" />
                    <span className=" ml-1 md:ml-2 text-gray-50 ">Projects</span>
                </div>
                <div id="resume" tabIndex="0" onFocus={this.changeScreen} className={(this.state.active_screen === "resume" ? " bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95" : " hover:bg-gray-50 hover:bg-opacity-5 ") + " w-28 md:w-full md:rounded-none rounded-sm cursor-default outline-none py-1.5 focus:outline-none duration-100 my-0.5 flex justify-start items-center pl-2 md:pl-2.5"}>
                    <img className=" w-3 md:w-4" alt="Unnippillil's resume" src="./themes/Yaru/status/download.svg" />
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

export default AboutVivek;

export const displayAboutVivek = () => {
    return <AboutVivek />;
}


function About() {
    return (
        <>
            <div className="w-20 md:w-28 my-4 full">
                <img className="w-full" src="./images/logos/bitmoji.png" alt="Alex Unnippillil Logo" />
            </div>
            <div className=" mt-4 md:mt-8 text-lg md:text-2xl text-center px-1">
                <div>My name is <span className="font-bold">Alex Unnippillil</span>, </div>
                <div className="font-normal ml-1">I'm a <span className="text-ubt-blue font-bold"> Cybersecurity Specialist!</span></div>
            </div>
            <div className=" mt-4 relative md:my-8 pt-px bg-white w-32 md:w-48">
                <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 left-0"></div>
                <div className="bg-white absolute rounded-full p-0.5 md:p-1 top-0 transform -translate-y-1/2 right-0"></div>
            </div>
            <ul className=" mt-4 leading-tight tracking-tight text-sm md:text-base w-5/6 md:w-3/4 emoji-list">
                <li className=" list-pc">I'm a <span className=" font-medium"> Technology Enthusiast </span> who thrives on the thrill of learning and mastering the rapidly evolving world of tech. I've completed 3 of a 4 year degree in <u className=' cursor-pointer '><a href="https://shared.ontariotechu.ca/shared/faculty/fesns/documents/FESNS%20Program%20Maps/2018_nuclear_engineering_map_2017_entry.pdf" target={"_blank"}>Nuclear Engineering </a></u> at OntarioTech University before, I decided to switch majors and pursue a 4 year degree in my passion of <u className=' cursor-pointer '> <a href="https://businessandit.ontariotechu.ca/undergraduate/bachelor-of-information-technology/networking-and-information-technology-security/networking-and-i.t-security-bit-2023-2024_.pdf" target={"_blank"}> Networking and I.T. Security</a> </u>.</li>   
                <li className=" mt-3 list-building">  If you're looking for the type of person that always wants to help others. That'll be there putting in the work 24/7. Please feel free to send an email <a className='text-underline'
                              href='mailto:alex.unnippillil@hotmail.com'><u>@alex.unnippillil@hotmail.com</u></a></li>
                <li className=" mt-3 list-time"> When I am not learning my next technical skill, I like to spend my time reading books, rock climbing or watching <u className=' cursor-pointer '><a href="https://www.youtube.com/@Alex-Unnippillil/playlists" target={"_blank"}>Youtube Videos</a></u> and <u className=' cursor-pointer '><a href="https://myanimelist.net/animelist/alex_u" target={"_blank"}>Anime</a></u></li> 
                <li className=" mt-3 list-star"> And I also have interests in Deep Learning, Software Development & Animation!</li> </ul>  </>
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
                    <div className=" text-sm text-gray-400 mt-0.5">2017 - 2022</div>
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
                    <div className=" text-sm md:text-base">  International Baccalaureate Candidate</div>
                    <div className="text-sm text-gray-300 font-bold mt-1"> </div>
                </li>
            </ul>
        </>
    )
}
function Skills() {
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
                    <div>I've learned a variety of programming languages and frameworks while <strong className="text-ubt-gedit-blue">specializing in network security</strong></div>
                </li>
                <li className=" list-arrow text-sm md:text-base mt-4 leading-tight tracking-tight">
                    <div>Below are some skills I've learned over the years</div>
                </li>
            </ul>
            <div className="w-full md:w-10/12 flex mt-4">
                <div className=" text-sm text-center md:text-base w-1/2 font-bold">Networking & Security</div>
                <div className=" text-sm text-center md:text-base w-1/2 font-bold">Softwares & Operating Systems</div>
            </div>
            <div className="w-full md:w-10/12 flex justify-center items-start font-bold text-center">
                <div className="px-2 w-1/2">
                    <div className="flex flex-wrap justify-center items-start w-full mt-2">
                        <img className="m-1" src="https://img.shields.io/badge/AWS-%23FF9900.svg?logo=amazon-aws&logoColor=white" alt="alex aws" />
                        <img className="m-1" src="https://img.shields.io/badge/Azure-%230072C6.svg?logo=microsoftazure&logoColor=white" alt="alex azure" />
                        <img className=" m-1" src="https://img.shields.io/badge/Windows_Server-0078D6?logo=windows" alt="unnippillil server" />
                        <img className="m-1" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff" alt="alex docker" />
                        <img className="m-1" src="https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=fff" alt="alex  kubernetes" />
                        <img className="m-1" src="https://img.shields.io/badge/Tor-7D4698?logo=Tor-Browser&logoColor=white" alt="alex tor" />
                        <img className="m-1" src="https://img.shields.io/badge/CCNA-007ACC?logo=Cisco&logoColor=fff" alt="CCNA unnippillil" />
                        <img className="m-1" src="https://img.shields.io/badge/CCNP-007ACC?logo=Cisco&logoColor=fff" alt="ccnp unnippillil" />
                        <img className="m-1" src="https://img.shields.io/badge/PuTTY-7D4698?logo=gnometerminal&logoColor=white" alt="unnippillil PuTTY" />
                        <img className="m-1" src="https://img.shields.io/badge/Wireshark-%230072C6.svg?logo=wireshark&logoColor=white" alt="alex wireshark" />
                        <img className=" m-1" src="https://img.shields.io/badge/OWASP-black?style=flat&logo=OWASP&logoColor=ffffff" alt="unnippillil OWASP" />
                        
                      
                    </div>
                </div>
                <div className="px-2 flex flex-wrap items-start w-1/2">
                    <div className="flex flex-wrap justify-center items-start w-full mt-2">
                        <img className=" m-1" src="https://img.shields.io/badge/PowerShell-%235391FE.svg?logo=powershell&logoColor=white" alt="alex powershell" />
                        <img src="https://img.shields.io/badge/-VMware-FFCA28?style=flat&logo=vmware&logoColor=ffffff" alt="unnippillil alex" className="m-1" />
                        <img className="m-1" src="https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white" alt="unnippillil windows" />
                        <img className="m-1" src="https://img.shields.io/badge/Kali%20Linux-557C94?logo=kalilinux&logoColor=fff" alt="kali linux unnippillil" />
                        <img src="https://img.shields.io/badge/Fedora-51A2DA?logo=fedora&logoColor=fff" alt="unnippillil fedora" className="m-1" />
                        <img src="https://img.shields.io/badge/macOS-000000?logo=macos&logoColor=F0F0F0" alt="unnippillil macos" className="m-1" />
                        <img className="m-1" src="https://img.shields.io/badge/PyCharm-143?logo=pycharm&logoColor=black&color=black&labelColor=green" alt="pycharm alex" />
                        <img className="m-1" src="https://img.shields.io/badge/Unity-%23000000.svg?logo=unity&logoColor=white" alt="unity alex" />
                        <img className="m-1" src="https://img.shields.io/badge/Xcode-007ACC?logo=Xcode&logoColor=white" alt="xcode alex" />
                        <img className="m-1" src="https://img.shields.io/badge/Android%20Studio-3DDC84?logo=android-studio&logoColor=white" alt="alex android studio" />
                    </div>
                </div>
            </div>
            <div className="w-full md:w-10/12 flex mt-4">
                <div className=" text-sm text-center md:text-base w-1/2 font-bold">Languages & Tools</div>
                <div className=" text-sm text-center md:text-base w-1/2 font-bold">Frameworks & Libraries</div>
            </div>
            <div className="w-full md:w-10/12 flex justify-center items-start font-bold text-center">
                <div className="px-2 w-1/2">
                    <div className="flex flex-wrap justify-center items-start w-full mt-2">
                        <img className="m-1" src="https://img.shields.io/badge/-JavaScript-%23F7DF1C?style=flat&logo=javascript&logoColor=000000&labelColor=%23F7DF1C&color=%23FFCE5A" alt="unnippillil javascript" />
                        <img className="m-1" src="https://img.shields.io/badge/C%2B%2B-00599C?style=flat&logo=c%2B%2B&logoColor=white" alt="unnippillil c++" />
                        <img className="m-1" src="http://img.shields.io/badge/-Python-3776AB?style=flat&logo=python&logoColor=ffffff" alt="unnippillil python" />
                        <img className="m-1" src="https://img.shields.io/badge/Dart-0175C2?style=flat&logo=dart&logoColor=white" alt="unnippillil dart" />
                        <a href="https://www.google.com/search?q=is+html+a+language%3F" target="_blank" rel="noreferrer"><img title="yes it's a language!" className="m-1" src="https://img.shields.io/badge/-HTML5-%23E44D27?style=flat&logo=html5&logoColor=ffffff" alt="unnippillil HTML" /></a>
                        <img src="https://img.shields.io/badge/CSS-1572B6?logo=css3&logoColor=fff" alt="unnippillil css" className="m-1" />
                        <img src="https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=fff" alt="unnippillil mysql" className="m-1" />
                        <img src="https://img.shields.io/badge/Java-%23ED8B00.svg?logo=openjdk&logoColor=white" alt="unnippillil Java" className="m-1" />
                    </div>
                </div>
                <div className="px-2 flex flex-wrap items-start w-1/2">
                    <div className="flex flex-wrap justify-center items-start w-full mt-2">
                        <img className=" m-1" src="https://img.shields.io/badge/Next-black?style=flat&logo=next.js&logoColor=ffffff" alt="unnippillil next" />
                        <img className=" m-1" src="https://img.shields.io/badge/-React-61DAFB?style=flat&logo=react&logoColor=ffffff" alt="unnippillil react" />
                        <img className="m-1" src="https://img.shields.io/badge/Flutter-02569B?style=flat&logo=flutter&logoColor=white" alt="unnippillil flutter" />
                        <img className="m-1" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white" alt="unnippillil tailwind css" />
                        <img src="https://img.shields.io/badge/-Nodejs-339933?style=flat&logo=Node.js&logoColor=ffffff" alt="unnippillil node.js" className="m-1" />
                        <img src="https://img.shields.io/badge/jQuery-0769AD?style=flat&logo=jquery&logoColor=white" alt="unnippillil jquery" className="m-1" />
                        <img className="m-1" src="https://img.shields.io/badge/Hydrogen-7AB55C?logo=shopify&logoColor=fff" alt="unnippillil hydrogen" />
                        <img className=" m-1" src="https://img.shields.io/badge/NIST-black?style=flat&logo=netapp&logoColor=ffffff" alt="unnippillil NIST" />
                    </div>
                </div>
            </div>
            <div className="tracking-tight text-sm md:text-base w-10/12 emoji-list mt-4 flex">
                <span className="list-arrow text-sm md:text-base mt-4 leading-tight tracking-tight mr-4">
                    ...and current certs and typing speed
                </span>
                            
            <a href="https://data.typeracer.com/pit/profile?user=ulexa&ref=badge" target="_blank" rel="noopener noreferrer" className="mr-4">
                <img src="https://data.typeracer.com/misc/badge?user=ulexa" border="0" alt="TypeRacer.com scorecard for user ulexa"/>
            </a>

            <a href="https://www.credly.com/badges/783aed9a-91a7-4a2e-a4b8-11dbd0d25fc2/public_url" target="_blank" rel="noopener noreferrer" className="mr-4">
                <img src="https://images.credly.com/size/110x110/images/0bf0f2da-a699-4c82-82e2-56dcf1f2e1c7/image.png" border="0" alt="Google Cybersecurity Certificate" style={{width: "140px", height: "140px"}}/>
            </a>

            <a href="https://www.credly.com/badges/53415f6e-162e-414e-971d-942aefc755d2/public_url" target="_blank" rel="noopener noreferrer" className="mr-4">
                <img src="https://images.credly.com/size/340x340/images/70675aed-31be-4c30-add7-b99905a34005/image.png" border="0" alt="BM AI Developer Professional Certificate" style={{width: "120px", height: "120px"}}/>
            </a>
            <a href="https://www.credly.com/badges/f1ec265d-6798-4fc0-b98e-ad5ac71f58c0" target="_blank" rel="noopener noreferrer" className="mr-4">
                <img src="https://images.credly.com/size/110x110/images/9180921d-4a13-429e-9357-6f9706a554f0/image.png" border="0" alt="ISC2 Candidate" style={{width: "120px", height: "120px"}}/>
            </a>
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
                        <a key={index} href={project.link} target="_blank" rel="noreferrer" className="flex w-full flex-col px-4">
                            <div className="w-full py-1 px-2 my-2 border border-gray-50 border-opacity-10 rounded hover:bg-gray-50 hover:bg-opacity-5 cursor-pointer">
                                <div className="flex flex-wrap justify-between items-center">
                                    <div className='flex justify-center items-center'>
                                        <div className=" text-base md:text-lg mr-2">{project.name.toLowerCase()}</div>
                                        <iframe src={`https://ghbtns.com/github-btn.html?user=alex-unnippillil&repo=${projectName}&type=star&count=true`} frameBorder="0" scrolling="0" width="150" height="20" title={project.name.toLowerCase()+"-star"}></iframe>
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
        <iframe className="h-full w-full" src="./files/Alex-Unnippillil-Resume.pdf" title="Alex Unnippillil Resume" frameBorder="0"></iframe>
    )
}

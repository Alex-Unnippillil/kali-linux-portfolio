import React, { Component } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';

// Simple helper for notifications that falls back to alert()
const notify = (title, body) => {
    if (typeof window === 'undefined') return;
    if ('Notification' in window && Notification.permission === 'granted') {
        // eslint-disable-next-line no-new
        new Notification(title, { body });
    } else {
        // eslint-disable-next-line no-alert
        alert(`${title}: ${body}`);
    }
};

export class Gedit extends Component {

    constructor() {
        super();
        this.state = {
            sending: false,
            name: '',
            subject: '',
            message: '',
            website: '', // honeypot field
            nameError: false,
            messageError: false,
        }
    }
    handleChange = (field) => (e) => {
        this.setState({ [field]: e.target.value, [`${field}Error`]: false });
    }

    sendMessage = async () => {
        let { name, subject, message, website } = this.state;

        name = name.trim();
        subject = subject.trim();
        message = message.trim();
        website = website.trim();

        let error = false;

        if (name.length === 0) {
            this.setState({ name: '', nameError: true });
            error = true;
        }

        if (message.length === 0) {
            this.setState({ message: '', messageError: true });
            error = true;
        }
        if (website.length !== 0) {
            // Honeypot filled in - likely a bot
            return;
        }

        if (error) return;

        const lastContact = Number(localStorage.getItem('last-contact') || '0');
        if (Date.now() - lastContact < 60000) {
            notify('Slow down', 'Please wait before sending another message.');
            return;
        }

        this.setState({ sending: true });

        const attemptComplete = () => {
            this.setState({ sending: false, name: '', subject: '', message: '', website: '' });
            localStorage.setItem('last-contact', Date.now().toString());
            document.getElementById('close-gedit')?.click();
        };

        const mailto = `mailto:alex.j.unnippillil@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message + '\n\nFrom: ' + name)}`;

        if (navigator.onLine) {
            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, subject, message }),
                });
                if (res.ok) {
                    notify('Message Sent', 'Thanks for reaching out!');
                    ReactGA.event({
                        category: 'contact',
                        action: 'submit_success',
                    });
                    attemptComplete();
                    return;
                }
            } catch (e) {
                // fall through to mailto
            }
        }

        notify('Message Failed', 'Opening mail client');
        window.open(mailto);
        attemptComplete();

    }

    render() {
        return (
            <div className="w-full h-full relative flex flex-col bg-ub-cool-grey text-white select-none">
                <div className="flex items-center justify-between w-full bg-ub-gedit-light bg-opacity-60 border-b border-t border-blue-400 text-sm">
                    <span className="font-bold ml-2">Send a Message to Me</span>
                    <div className="flex">
                        <div onClick={this.sendMessage} className="border border-black bg-black bg-opacity-50 px-3 py-0.5 my-1 mx-1 rounded hover:bg-opacity-80">Send</div>
                    </div>
                </div>
                <div className="relative flex-grow flex flex-col bg-ub-gedit-dark font-normal windowMainScreen">
                    <div className="absolute left-0 top-0 h-full px-2 bg-ub-gedit-darker"></div>
                    <div className="relative">
                        <input id="sender-name" value={this.state.name} onChange={this.handleChange('name')} className=" w-full text-ubt-gedit-orange focus:bg-ub-gedit-light outline-none font-medium text-sm pl-6 py-0.5 bg-transparent" placeholder={this.state.nameError ? "Name must not be Empty!" : "Your Email / Name :"} spellCheck="false" autoComplete="off" type="text" />
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 font-bold light text-sm text-ubt-gedit-blue">1</span>
                    </div>
                    <div className="relative">
                        <input id="sender-subject" value={this.state.subject} onChange={this.handleChange('subject')} className=" w-full my-1 text-ubt-gedit-blue focus:bg-ub-gedit-light gedit-subject outline-none text-sm font-normal pl-6 py-0.5 bg-transparent" placeholder="subject (may be a feedback for this website!)" spellCheck="false" autoComplete="off" type="text" />
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 font-bold  text-sm text-ubt-gedit-blue">2</span>
                    </div>
                    <input value={this.state.website} onChange={this.handleChange('website')} className="hidden" type="text" tabIndex="-1" autoComplete="off" />
                    <div className="relative flex-grow">
                        <textarea id="sender-message" value={this.state.message} onChange={this.handleChange('message')} className=" w-full gedit-message font-light text-sm resize-none h-full windowMainScreen outline-none tracking-wider pl-6 py-1 bg-transparent" placeholder={this.state.messageError ? "Message must not be Empty!" : "Message"} spellCheck="false" autoComplete="none" type="text" />
                        <span className="absolute left-1 top-1 font-bold  text-sm text-ubt-gedit-blue">3</span>
                    </div>
                </div>
                {
                    (this.state.sending
                        ?
                        <div className="flex justify-center items-center animate-pulse h-full w-full bg-gray-400 bg-opacity-30 absolute top-0 left-0">
                            <Image
                                className=" w-8 absolute animate-spin"
                                src="/themes/Yaru/status/process-working-symbolic.svg"
                                alt="Ubuntu Process Symbol"
                                width={32}
                                height={32}
                                sizes="32px"
                                priority
                            />
                        </div>
                        : null
                    )
                }
            </div>
        )
    }
}

export default Gedit;

export const displayGedit = () => {
    return <Gedit> </Gedit>;
}

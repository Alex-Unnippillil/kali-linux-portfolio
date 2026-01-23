import React, { Component } from 'react';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import emailjs from '@emailjs/browser';
import ProgressBar from '../ui/ProgressBar';
import { createDisplay } from '../../utils/createDynamicApp';

export class Gedit extends Component {

    constructor() {
        super();
        this.state = {
            sending: false,
            showProgress: false,
            progress: 0,
            name: '',
            subject: '',
            message: '',
            nameError: false,
            messageError: false,
            nameTouched: false,
            messageTouched: false,
            location: null,
            timezone: '',
            localTime: '',
        }
        this.progressTimer = null;
        this.progressInterval = null;
    }

    componentDidMount() {
        emailjs.init(process.env.NEXT_PUBLIC_USER_ID);
        this.fetchLocation();
    }

    componentWillUnmount() {
        if (this.timeFrame) cancelAnimationFrame(this.timeFrame);
        if (this.progressTimer) clearTimeout(this.progressTimer);
        if (this.progressInterval) clearInterval(this.progressInterval);
    }

    fetchLocation = () => {
        if (typeof jest !== 'undefined') return;
        if (typeof fetch === 'undefined') return;
        fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
                const { latitude, longitude, timezone } = data;
                this.setState({ location: { latitude, longitude }, timezone }, this.updateTime);
            })
            .catch(() => { });
    }

    updateTime = () => {
        const { timezone } = this.state;
        if (timezone) {
            const formatter = new Intl.DateTimeFormat([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: timezone,
            });
            this.setState({ localTime: formatter.format(new Date()) });
        }
        this.timeFrame = requestAnimationFrame(this.updateTime);
    }

    handleChange = (field) => (e) => {
        this.setState({ [field]: e.target.value }, () => {
            if (this.state[`${field}Touched`]) {
                const value = this.state[field].trim();
                this.setState({ [`${field}Error`]: value.length === 0 });
            }
        });
    }

    handleBlur = (field) => () => {
        const value = this.state[field].trim();
        this.setState({
            [`${field}Touched`]: true,
            [`${field}Error`]: value.length === 0
        });
    }

    sendMessage = async () => {
        let { name, subject, message } = this.state;

        name = name.trim();
        subject = subject.trim();
        message = message.trim();

        let error = false;

        if (name.length === 0) {
            this.setState({ name: '', nameError: true, nameTouched: true });
            error = true;
        }

        if (message.length === 0) {
            this.setState({ message: '', messageError: true, messageTouched: true });
            error = true;
        }
        if (error) return;

        this.setState({ sending: true, showProgress: false, progress: 0 });

        this.progressTimer = setTimeout(() => {
            this.setState({ showProgress: true });
            this.progressInterval = setInterval(() => {
                this.setState((prev) => ({ progress: Math.min(prev.progress + 5, 95) }));
            }, 500);
        }, 10000);

        const serviceID = process.env.NEXT_PUBLIC_SERVICE_ID;
        const templateID = process.env.NEXT_PUBLIC_TEMPLATE_ID;
        const templateParams = {
            'name': name,
            'subject': subject,
            'message': message,
        }

        try {
            await emailjs.send(serviceID, templateID, templateParams);
            this.setState({ name: '', subject: '', message: '' });
            ReactGA.event({
                category: "contact",
                action: "submit_success",
            });
        } catch {
            // ignore errors
        } finally {
            if (this.progressTimer) clearTimeout(this.progressTimer);
            if (this.progressInterval) clearInterval(this.progressInterval);
            this.setState({ progress: 100 });
            document.getElementById('close-gedit')?.click();
            setTimeout(() => this.setState({ sending: false, showProgress: false, progress: 0 }), 300);
        }

    }

    render() {
        const nameValid = this.state.nameTouched && !this.state.nameError;
        const nameInvalid = this.state.nameTouched && this.state.nameError;
        const messageValid = this.state.messageTouched && !this.state.messageError;
        const messageInvalid = this.state.messageTouched && this.state.messageError;
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
                        <input id="sender-name" value={this.state.name} onChange={this.handleChange('name')} onBlur={this.handleBlur('name')} aria-label="Your email or name" aria-invalid={nameInvalid} aria-describedby="name-status" className={`w-full text-ubt-gedit-orange focus:bg-ub-gedit-light outline-none font-medium text-sm pl-6 py-0.5 bg-transparent ${nameInvalid ? 'border border-red-500' : nameValid ? 'border border-emerald-500' : ''}`} placeholder="Your Email / Name :" spellCheck="false" autoComplete="off" type="text" />
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 font-bold light text-sm text-ubt-gedit-blue">1</span>
                        <p id="name-status" className={`text-xs mt-1 ${nameInvalid ? 'text-red-400' : nameValid ? 'text-emerald-400' : 'sr-only'}`} aria-live="polite">
                            {nameInvalid ? 'Name must not be empty' : nameValid ? 'Looks good' : ''}
                        </p>
                    </div>
                    <div className="relative">
                        <input id="sender-subject" value={this.state.subject} onChange={this.handleChange('subject')} aria-label="Subject" className=" w-full my-1 text-ubt-gedit-blue focus:bg-ub-gedit-light gedit-subject outline-none text-sm font-normal pl-6 py-0.5 bg-transparent" placeholder="subject (may be a feedback for this website!)" spellCheck="false" autoComplete="off" type="text" />
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 font-bold  text-sm text-ubt-gedit-blue">2</span>
                    </div>
                    <div className="relative flex-grow">
                        <textarea id="sender-message" value={this.state.message} onChange={this.handleChange('message')} onBlur={this.handleBlur('message')} aria-label="Message" aria-invalid={messageInvalid} aria-describedby="message-status" className={`w-full gedit-message font-light text-sm resize-none h-full windowMainScreen outline-none tracking-wider pl-6 py-1 bg-transparent ${messageInvalid ? 'border border-red-500' : messageValid ? 'border border-emerald-500' : ''}`} placeholder="Message" spellCheck="false" autoComplete="none" type="text" />
                        <span className="absolute left-1 top-1 font-bold  text-sm text-ubt-gedit-blue">3</span>
                        <p id="message-status" className={`text-xs mt-1 ${messageInvalid ? 'text-red-400' : messageValid ? 'text-emerald-400' : 'sr-only'}`} aria-live="polite">
                            {messageInvalid ? 'Message must not be empty' : messageValid ? 'Looks good' : ''}
                        </p>
                    </div>
                </div>
                {
                    this.state.location &&
                    <div className="bg-ub-gedit-dark border-t border-b border-ubt-gedit-blue p-2">
                        <h2 className="font-bold text-sm mb-1">Your Local Time</h2>
                        <Image
                            src={`https://staticmap.openstreetmap.de/staticmap.php?center=${this.state.location.latitude},${this.state.location.longitude}&zoom=3&size=300x150&markers=${this.state.location.latitude},${this.state.location.longitude},red-dot`}
                            alt="Map showing your approximate location"
                            className="w-full rounded"
                            width={300}
                            height={150}
                            sizes="(max-width: 300px) 100vw, 300px"
                        />
                        <p className="text-center mt-2" aria-live="polite">{this.state.localTime}</p>
                    </div>
                }
                {
                    this.state.sending && (
                        <div className="flex justify-center items-center h-full w-full bg-gray-400 bg-opacity-30 absolute top-0 left-0">
                            {this.state.showProgress ? (
                                <ProgressBar progress={this.state.progress} />
                            ) : (
                                <Image
                                    className="w-8 motion-safe:animate-spin"
                                    src="/themes/Yaru/status/process-working-symbolic.svg"
                                    alt="Ubuntu Process Symbol"
                                    width={32}
                                    height={32}
                                    sizes="32px"
                                    priority
                                />
                            )}
                        </div>
                    )
                }
            </div>
        )
    }
}

export default Gedit;
export const displayGedit = createDisplay(Gedit);

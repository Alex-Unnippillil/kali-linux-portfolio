import React, { useEffect } from 'react';
import Image from 'next/image';

function BootingScreen({ visible, isShutDown, turnOn }) {
    useEffect(() => {
        if (isShutDown) {
            const handler = () => {
                turnOn();
            };
            window.addEventListener('keydown', handler);
            window.addEventListener('click', handler);
            return () => {
                window.removeEventListener('keydown', handler);
                window.removeEventListener('click', handler);
            };
        }
    }, [isShutDown, turnOn]);

    return (
        <div
            style={{
                ...(visible || isShutDown ? { zIndex: '100' } : { zIndex: '-20' }),
                contentVisibility: 'auto',
            }}
            className={
                (visible || isShutDown ? ' visible opacity-100' : ' invisible opacity-0') +
                ' absolute duration-500 select-none flex flex-col justify-around items-center top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen bg-black'
            }
        >
            <Image
                width={400}
                height={400}
                className="md:w-1/4 w-1/2"
                src="/themes/Yaru/status/icons8-kali-linux.svg"
                alt="Kali Logo"
                sizes="(max-width: 768px) 50vw, 25vw"
                priority
            />
            <div className="w-10 h-10 flex justify-center items-center rounded-full outline-none cursor-pointer" onClick={turnOn}>
                {isShutDown ? (
                    <div className="bg-white rounded-full flex justify-center items-center w-10 h-10 hover:bg-gray-300">
                        <Image
                            width={32}
                            height={32}
                            className="w-8"
                            src="/themes/Yaru/status/power-button.svg"
                            alt="Power Button"
                            sizes="32px"
                            priority
                        />
                    </div>
                ) : (
                    <Image
                        width={40}
                        height={40}
                        className={' w-10' + (visible ? ' animate-spin' : '')}
                        src="/themes/Yaru/status/process-working-symbolic.svg"
                        alt="Kali Process Symbol"
                        sizes="40px"
                        priority
                    />
                )}
            </div>
            <Image
                width={200}
                height={100}
                className="md:w-1/5 w-1/2"
                src="/images/logos/logo_1200.png"
                alt="Kali Linux Name"
                sizes="(max-width: 768px) 50vw, 20vw"
            />
            <div className="text-white mb-4">
                <a
                    className="underline"
                    href="https://www.linkedin.com/in/unnippillil/"
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    linkedin
                </a>
                <span className="font-bold mx-1">|</span>
                <a
                    href="https://github.com/Alex-Unnippillil"
                    rel="noopener noreferrer"
                    target="_blank"
                    className="underline"
                >
                    github
                </a>
            </div>
        </div>
    );
}

export default BootingScreen;


import React from 'react'
import Image from 'next/image'

function BootingScreen(props) {

    return (
        <div
            style={{
                ...(props.visible || props.isShutDown ? { zIndex: "100" } : { zIndex: "-20" }),
                contentVisibility: 'auto',
            }}
            className={(props.visible || props.isShutDown ? " visible opacity-100" : " invisible opacity-0 ") + " absolute duration-500 select-none flex flex-col justify-around items-center top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen bg-black"}>
            <Image
                width={400}
                height={400}
                className="md:w-1/4 w-1/2"
                src="/themes/Yaru/status/cof_orange_hex.svg"
                alt="Ubuntu Logo"
                sizes="(max-width: 768px) 50vw, 25vw"
                priority
            />
            <button
                type="button"
                aria-label="Power on Kali desktop"
                onClick={props.turnOn}
                className="w-10 h-10 flex justify-center items-center rounded-full border border-transparent outline-none cursor-pointer transition hover:border-[var(--color-accent)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
                {(props.isShutDown
                    ? <Image width={32} height={32} className="w-8" src="/themes/Kali/panel/power-button.svg" alt="Power Button" sizes="32px" priority/>
                    : <div className={"w-10 h-10 rounded-full border-4 border-white/20 border-t-[var(--color-accent)] " + (props.visible ? "animate-spin" : "")}></div>)}
            </button>
            <Image
                width={200}
                height={100}
                className="md:w-1/5 w-1/2"
                src="/themes/Yaru/status/ubuntu_white_hex.svg"
                alt="Kali Linux Name"
                sizes="(max-width: 768px) 50vw, 20vw"
            />
            <div className="text-white mb-4">
                <a className="underline" href="https://www.linkedin.com/in/unnippillil/" rel="noopener noreferrer" target="_blank">linkedin</a>
                <span className="font-bold mx-1">|</span>
                <a href="https://github.com/Alex-Unnippillil" rel="noopener noreferrer" target="_blank" className="underline">github</a>
            </div>
        </div>
    )
}

export default BootingScreen

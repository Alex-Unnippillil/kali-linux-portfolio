import React from 'react'
import Image from 'next/image'

function BootingScreen(props) {

    return (
        <div style={(props.visible || props.isShutDown ? { zIndex: "100" } : { zIndex: "-20" })} className={(props.visible || props.isShutDown ? " visible opacity-100" : " invisible opacity-0 ") + " absolute duration-500 select-none flex flex-col justify-around items-center top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen bg-black"}>
            <Image
                width={400}
                height={400}
                className="md:w-1/4 w-1/2"
                src="/themes/Yaru/status/cof_orange_hex.svg"
                alt="Ubuntu Logo"
                sizes="(max-width: 768px) 50vw, 25vw"
                priority
            />
            <div className="w-10 h-10 flex justify-center items-center rounded-full outline-none cursor-pointer" onClick={props.turnOn} >
                {(props.isShutDown
                    ? <div className="bg-white rounded-full flex justify-center items-center w-10 h-10 hover:bg-gray-300"><Image width={32} height={32} className="w-8" src="/themes/Yaru/status/power-button.svg" alt="Power Button" sizes="32px" priority/></div>
                    : <Image width={40} height={40} className={" w-10 " + (props.visible ? " animate-spin " : "")} src="/themes/Yaru/status/process-working-symbolic.svg" alt="Ubuntu Process Symbol" sizes="40px" priority/>)}
            </div>
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

import React from 'react'

function DefaultMenu(props) {
    return (
        <div
            id="default-menu"
            className={
                (props.active ? "block pointer-events-auto " : "hidden pointer-events-none ") +
                "cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-menu text-sm"
            }
        >

            <Devider />
            <a rel="noopener noreferrer" href="https://www.linkedin.com/in/unnippillil/" target="_blank" className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5">
                <span className="ml-5">🙋‍♂️</span> <span className="ml-2">Follow on <strong>Linkedin</strong></span>
            </a>
            <a rel="noopener noreferrer" href="https://github.com/Alex-Unnippillil" target="_blank" className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5">
                <span className="ml-5">🤝</span> <span className="ml-2">Follow on <strong>Github</strong></span>
            </a>
            <a rel="noopener noreferrer" href="mailto:alex.j.unnippillil@gmail.com" target="_blank" className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5">
                <span className="ml-5">📥</span> <span className="ml-2">Contact Me</span>
            </a>
            <Devider />
            <div onClick={() => { localStorage.clear(); window.location.reload() }} className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5">
                <span className="ml-5">🧹</span> <span className="ml-2">Reset Kali Linux</span>
            </div>
        </div>
    )
}

function Devider() {
    return (
        <div className="flex justify-center w-full">
            <div className=" border-t border-gray-900 py-1 w-2/5"></div>
        </div>
    );
}

export default DefaultMenu

import React, { useEffect } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';
import Modal from '../base/Modal';

export default function LockScreen(props) {
    const { wallpaper } = useSettings();

    useEffect(() => {
        if (props.isLocked) {
            window.addEventListener('click', props.unLockScreen);
            window.addEventListener('keypress', props.unLockScreen);
        }
        return () => {
            window.removeEventListener('click', props.unLockScreen);
            window.removeEventListener('keypress', props.unLockScreen);
        };
    }, [props.isLocked, props.unLockScreen]);

    return (
        <Modal isOpen={props.isLocked} onClose={props.unLockScreen}>
            <div
                id="ubuntu-lock-screen"
                style={{ zIndex: '100', contentVisibility: 'auto' }}
                className="absolute outline-none bg-black bg-opacity-90 top-0 right-0 overflow-hidden m-0 p-0 h-screen w-screen"
            >
                <div
                    style={{
                        backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat',
                        backgroundPositionX: 'center'
                    }}
                    className="absolute top-0 left-0 w-full h-full transform z-20 blur-md"
                ></div>
                <div className="w-full h-full z-50 overflow-hidden relative flex flex-col justify-center items-center text-white">
                    <div className=" text-7xl">
                        <Clock onlyTime={true} />
                    </div>
                    <div className="mt-4 text-xl font-medium">
                        <Clock onlyDay={true} />
                    </div>
                    <div className=" mt-16 text-base">
                        Click or Press a key to unlock
                    </div>
                </div>
            </div>
        </Modal>
    );
}


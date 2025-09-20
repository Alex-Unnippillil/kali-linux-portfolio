import { useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import useLocaleDirection from '../../hooks/useLocaleDirection';

export default function Navbar() {
        const [statusOpen, setStatusOpen] = useState(false);
        const isRTL = useLocaleDirection() === 'rtl';

        const barLayout = isRTL ? 'flex-row-reverse' : '';
        const networkPadding = isRTL ? 'pr-3 pl-1' : 'pl-3 pr-1';

        return (
                <div className={`main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50 ${barLayout}`}>
                        <div className={networkPadding}>
                                <Image src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg" alt="network icon" width={16} height={16} className="w-4 h-4" />
                        </div>
                        <WhiskerMenu />
                        <div className="pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1">
                                <Clock />
                        </div>
                        <button
                                type="button"
                                id="status-bar"
                                aria-label="System status"
                                onClick={() => setStatusOpen((open) => !open)}
                                className="relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1"
                                aria-expanded={statusOpen}
                        >
                                <Status />
                                <QuickSettings open={statusOpen} />
                        </button>
                </div>
        );
}

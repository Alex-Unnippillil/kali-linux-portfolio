import React, { Component } from 'react';
import BootingScreen from './screen/booting_screen';
import Desktop from './screen/desktop';
import LockScreen from './screen/lock_screen';
import Navbar from './screen/navbar';
import ReactGA from 'react-ga4';
export default class Ubuntu extends Component {
    constructor(props) {
        super(props);
        this.setTimeOutBootScreen = () => {
            setTimeout(() => {
                this.setState({ booting_screen: false });
            }, 2000);
        };
        this.getLocalData = () => {
            let booting_screen = null;
            try {
                booting_screen = localStorage.getItem('booting_screen');
            }
            catch {
                this.setTimeOutBootScreen();
                return;
            }
            if (booting_screen !== null && booting_screen !== undefined) {
                this.setState({ booting_screen: false });
            }
            else {
                try {
                    localStorage.setItem('booting_screen', 'false');
                }
                catch {
                    // ignore persistence when storage is unavailable
                }
                this.setTimeOutBootScreen();
            }
            let shut_down = null;
            try {
                shut_down = localStorage.getItem('shut-down');
            }
            catch {
                return;
            }
            if (shut_down !== null && shut_down !== undefined && shut_down === 'true')
                this.shutDown();
            else {
                let screen_locked = null;
                try {
                    screen_locked = localStorage.getItem('screen-locked');
                }
                catch {
                    return;
                }
                if (screen_locked !== null && screen_locked !== undefined) {
                    this.setState({ screen_locked: screen_locked === 'true' });
                }
            }
        };
        this.lockScreen = () => {
            ReactGA.send({ hitType: 'pageview', page: '/lock-screen', title: 'Lock Screen' });
            ReactGA.event({
                category: `Screen Change`,
                action: `Set Screen to Locked`,
            });
            document.getElementById('status-bar')?.blur();
            setTimeout(() => {
                this.setState({ screen_locked: true });
            }, 100);
            localStorage.setItem('screen-locked', 'true');
        };
        this.unLockScreen = () => {
            ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });
            window.removeEventListener('click', this.unLockScreen);
            window.removeEventListener('keypress', this.unLockScreen);
            this.setState({ screen_locked: false });
            localStorage.setItem('screen-locked', 'false');
        };
        this.shutDown = () => {
            ReactGA.send({ hitType: 'pageview', page: '/switch-off', title: 'Custom Title' });
            ReactGA.event({
                category: `Screen Change`,
                action: `Switched off the Ubuntu`,
            });
            document.getElementById('status-bar')?.blur();
            this.setState({ shutDownScreen: true });
            localStorage.setItem('shut-down', 'true');
        };
        this.turnOn = () => {
            ReactGA.send({ hitType: 'pageview', page: '/desktop', title: 'Custom Title' });
            this.setState({ shutDownScreen: false, booting_screen: true });
            this.setTimeOutBootScreen();
            localStorage.setItem('shut-down', 'false');
        };
        this.state = {
            screen_locked: false,
            booting_screen: true,
            shutDownScreen: false,
        };
    }
    componentDidMount() {
        try {
            this.getLocalData();
        }
        catch {
            this.setTimeOutBootScreen();
        }
    }
    render() {
        return (<div className="w-screen h-screen overflow-hidden" id="monitor-screen">
        <LockScreen isLocked={this.state.screen_locked} unLockScreen={this.unLockScreen}/>
        <BootingScreen visible={this.state.booting_screen} isShutDown={this.state.shutDownScreen} turnOn={this.turnOn}/>
        <Navbar lockScreen={this.lockScreen} shutDown={this.shutDown}/>
        <Desktop />
      </div>);
    }
}

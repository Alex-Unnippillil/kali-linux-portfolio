import React, { Component } from 'react';
import Image from 'next/image';
import SmallArrow from './small_arrow';
import onClickOutside from 'react-onclickoutside';

class Slider extends Component {
	render() {
                        return (
                        <input
                                type="range"
                                onChange={this.props.onChange}
                                className={this.props.className}
                                name={this.props.name}
                                aria-label={this.props['aria-label'] || this.props.name}
                                min="0"
                                max="100"
                                value={this.props.value}
                                step="1"
                        />
                );
        }
}

export class StatusCard extends Component {
        constructor() {
                super();
                this.wrapperRef = React.createRef();
                this.state = {
                        sound_level: 75, // better of setting default values from localStorage
                        brightness_level: 100, // setting default value to 100 so that by default its always full.
                        color_scheme: 'system'
                };
        }
        handleClickOutside = () => {
                this.props.toggleVisible();
        };
        componentDidMount() {
                this.setState({
                        sound_level: localStorage.getItem('sound-level') || 75,
                        brightness_level: localStorage.getItem('brightness-level') || 100,
                        color_scheme: localStorage.getItem('color-scheme') || 'system'
                }, () => {
                        document.getElementById('monitor-screen').style.filter = `brightness(${3 / 400 * this.state.brightness_level +
                                0.25})`;
                        this.applyScheme(this.state.color_scheme);
                })
        }

	handleBrightness = (e) => {
		this.setState({ brightness_level: e.target.value });
		localStorage.setItem('brightness-level', e.target.value);
		// the function below inside brightness() is derived from a linear equation such that at 0 value of slider brightness still remains 0.25 so that it doesn't turn black.
		document.getElementById('monitor-screen').style.filter = `brightness(${3 / 400 * e.target.value + 0.25})`; // Using css filter to adjust the brightness in the root div.
	};

        handleSound = (e) => {
                this.setState({ sound_level: e.target.value });
                localStorage.setItem('sound-level', e.target.value);
        };

        applyScheme = (scheme) => {
                if (scheme === 'system') {
                        document.documentElement.removeAttribute('data-color-scheme');
                        localStorage.removeItem('color-scheme');
                } else {
                        document.documentElement.dataset.colorScheme = scheme;
                        localStorage.setItem('color-scheme', scheme);
                }
        };

        handleScheme = (e) => {
                const scheme = e.target.value;
                this.setState({ color_scheme: scheme });
                this.applyScheme(scheme);
        };

        render() {
		return (
			<div
				ref={this.wrapperRef}
				className={
					'absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 status-card' +
					(this.props.visible ? ' visible animateShow' : ' invisible')
				}
			>
				{' '}
				{/* Status Card */}
				<div className="absolute w-0 h-0 -top-1 right-6 top-arrow-up" />
				<div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
					<div className="w-8">
                                                <Image
                                                        width={16}
                                                        height={16}
                                                        src="/themes/Yaru/status/audio-headphones-symbolic.svg"
                                                        alt="ubuntu headphone"
                                                        sizes="16px"
                                                />
					</div>
                                        <Slider
                                                onChange={this.handleSound}
                                                className="ubuntu-slider w-2/3"
                                                value={this.state.sound_level}
                                                name="headphone_range"
                                                aria-label="Headphone volume"
                                        />
                                </div>
                                <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
                                        <div className="w-8">
                                                <Image
                                                        width={16}
                                                        height={16}
                                                        src="/themes/Yaru/status/display-brightness-symbolic.svg"
                                                        alt="ubuntu brightness"
                                                        sizes="16px"
                                                />
                                        </div>
                                        <Slider
                                                onChange={this.handleBrightness}
                                                className="ubuntu-slider w-2/3"
                                                name="brightness_range"
                                                value={this.state.brightness_level}
                                                aria-label="Screen brightness"
                                        />
                                </div>
                                <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
                                        <div className="w-8">
                                                <Image
                                                        width={16}
                                                        height={16}
                                                        src="/themes/Yaru/status/weather-clear-night-symbolic.svg"
                                                        alt="color scheme"
                                                        sizes="16px"
                                                />
                                        </div>
                                        <select
                                                onChange={this.handleScheme}
                                                value={this.state.color_scheme}
                                                className="bg-ub-cool-grey text-gray-400 w-2/3 border border-ubt-cool-grey rounded"
                                                aria-label="Color scheme"
                                        >
                                                <option value="system">System</option>
                                                <option value="light">Light</option>
                                                <option value="dark">Dark</option>
                                        </select>
                                </div>
                                <div className="w-64 flex content-center justify-center">
                                        <div className="w-2/4 border-black border-opacity-50 border-b my-2 border-solid" />
                                </div>
				<div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
					<div className="w-8">
                                                <Image
                                                        width={16}
                                                        height={16}
                                                        src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
                                                        alt="ubuntu wifi"
                                                        sizes="16px"
                                                />
					</div>
					<div className="w-2/3 flex items-center justify-between text-gray-400">
						<span>TellMyWiFiLoveHer</span>
						<SmallArrow angle="right" />
					</div>
				</div>
				<div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
					<div className="w-8">
                                                <Image
                                                        width={16}
                                                        height={16}
                                                        src="/themes/Yaru/status/bluetooth-symbolic.svg"
                                                        alt="ubuntu bluetooth"
                                                        sizes="16px"
                                                />
					</div>
					<div className="w-2/3 flex items-center justify-between text-gray-400">
						<span>Off</span>
						<SmallArrow angle="right" />
					</div>
				</div>
				<div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
					<div className="w-8">
                                                <Image
                                                        width={16}
                                                        height={16}
                                                        src="/themes/Yaru/status/battery-good-symbolic.svg"
                                                        alt="ubuntu battery"
                                                        sizes="16px"
                                                />
					</div>
					<div className="w-2/3 flex items-center justify-between text-gray-400">
						<span>2:42 Remaining (77%)</span>
						<SmallArrow angle="right" />
					</div>
				</div>
				<div className="w-64 flex content-center justify-center">
					<div className="w-2/4 border-black border-opacity-50 border-b my-2 border-solid" />
				</div>
				<div
					id="open-settings"
					className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20"
				>
					<div className="w-8">
                                                <Image
                                                        width={16}
                                                        height={16}
                                                        src="/themes/Yaru/status/emblem-system-symbolic.svg"
                                                        alt="ubuntu settings"
                                                        sizes="16px"
                                                />
					</div>
					<div className="w-2/3 flex items-center justify-between">
						<span>Settings</span>
					</div>
				</div>
				<div
					onClick={this.props.lockScreen}
					className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20"
				>
					<div className="w-8">
                                                <Image
                                                        width={16}
                                                        height={16}
                                                        src="/themes/Yaru/status/changes-prevent-symbolic.svg"
                                                        alt="ubuntu lock"
                                                        sizes="16px"
                                                />
					</div>
					<div className="w-2/3 flex items-center justify-between">
						<span>Lock</span>
					</div>
				</div>
				<div
					onClick={this.props.shutDown}
					className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20"
				>
					<div className="w-8">
                                                <Image
                                                        width={16}
                                                        height={16}
                                                        src="/themes/Yaru/status/system-shutdown-symbolic.svg"
                                                        alt="ubuntu power"
                                                        sizes="16px"
                                                />
					</div>
					<div className="w-2/3 flex items-center justify-between">
						<span>Power Off / Log Out</span>
						<SmallArrow angle="right" />
					</div>
				</div>
			</div>
		);
	}
}

export default onClickOutside(StatusCard);

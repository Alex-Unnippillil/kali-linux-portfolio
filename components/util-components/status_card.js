import React, { Component } from 'react';
import SmallArrow from './small_arrow';
import onClickOutside from 'react-onclickoutside';
import {
    SOUND_LEVEL_KEY,
    BRIGHTNESS_LEVEL_KEY,
    MONITOR_SCREEN_ID,
    OPEN_SETTINGS_ID,
    HEADPHONE_RANGE_NAME,
    BRIGHTNESS_RANGE_NAME,
    WIFI_SSID,
    BLUETOOTH_OFF_TEXT,
    BATTERY_STATUS_TEXT,
    SETTINGS_LABEL,
    LOCK_LABEL,
    POWER_OFF_LABEL,
    ALT_HEADPHONE,
    ALT_BRIGHTNESS,
    ALT_WIFI,
    ALT_BLUETOOTH,
    ALT_BATTERY,
    ALT_SETTINGS,
    ALT_LOCK,
    ALT_POWER,
} from '../../src/constants/strings';

class Slider extends Component {
	render() {
		return (
			<input
				type="range"
				onChange={this.props.onChange}
				className={this.props.className}
				name={this.props.name}
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
			brightness_level: 100 // setting default value to 100 so that by default its always full.
		};
	}
	handleClickOutside = () => {
		this.props.toggleVisible();
	};
	componentDidMount() {
                this.setState({
                        sound_level: localStorage.getItem(SOUND_LEVEL_KEY) || 75,
                        brightness_level: localStorage.getItem(BRIGHTNESS_LEVEL_KEY) || 100
                }, () => {
                        document.getElementById(MONITOR_SCREEN_ID).style.filter = `brightness(${3 / 400 * this.state.brightness_level +
                                0.25})`;
                })
        }

	handleBrightness = (e) => {
                this.setState({ brightness_level: e.target.value });
                localStorage.setItem(BRIGHTNESS_LEVEL_KEY, e.target.value);
                // the function below inside brightness() is derived from a linear equation such that at 0 value of slider brightness still remains 0.25 so that it doesn't turn black.
                document.getElementById(MONITOR_SCREEN_ID).style.filter = `brightness(${3 / 400 * e.target.value + 0.25})`; // Using css filter to adjust the brightness in the root div.
        };

	handleSound = (e) => {
                this.setState({ sound_level: e.target.value });
                localStorage.setItem(SOUND_LEVEL_KEY, e.target.value);
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
                                                <img width="16px" height="16px" src="./themes/Yaru/status/audio-headphones-symbolic.svg" alt={ALT_HEADPHONE} />
                                        </div>
                                        <Slider
                                                onChange={this.handleSound}
                                                className="ubuntu-slider w-2/3"
                                                value={this.state.sound_level}
                                                name={HEADPHONE_RANGE_NAME}
                                        />
                                </div>
                                <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
                                        <div className="w-8">
                                                <img width="16px" height="16px" src="./themes/Yaru/status/display-brightness-symbolic.svg" alt={ALT_BRIGHTNESS} />
                                        </div>
                                        <Slider
                                                onChange={this.handleBrightness}
                                                className="ubuntu-slider w-2/3"
                                                name={BRIGHTNESS_RANGE_NAME}
                                                value={this.state.brightness_level}
                                        />
                                </div>
				<div className="w-64 flex content-center justify-center">
					<div className="w-2/4 border-black border-opacity-50 border-b my-2 border-solid" />
				</div>
				<div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
                                        <div className="w-8">
                                                <img width="16px" height="16px" src="./themes/Yaru/status/network-wireless-signal-good-symbolic.svg" alt={ALT_WIFI} />
                                        </div>
                                        <div className="w-2/3 flex items-center justify-between text-gray-400">
                                                <span>{WIFI_SSID}</span>
                                                <SmallArrow angle="right" />
                                        </div>
                                </div>
                                <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
                                        <div className="w-8">
                                                <img width="16px" height="16px" src="./themes/Yaru/status/bluetooth-symbolic.svg" alt={ALT_BLUETOOTH} />
                                        </div>
                                        <div className="w-2/3 flex items-center justify-between text-gray-400">
                                                <span>{BLUETOOTH_OFF_TEXT}</span>
                                                <SmallArrow angle="right" />
                                        </div>
                                </div>
                                <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
                                        <div className="w-8">
                                                <img width="16px" height="16px" src="./themes/Yaru/status/battery-good-symbolic.svg" alt={ALT_BATTERY} />
                                        </div>
                                        <div className="w-2/3 flex items-center justify-between text-gray-400">
                                                <span>{BATTERY_STATUS_TEXT}</span>
                                                <SmallArrow angle="right" />
                                        </div>
                                </div>
				<div className="w-64 flex content-center justify-center">
					<div className="w-2/4 border-black border-opacity-50 border-b my-2 border-solid" />
				</div>
                                <div
                                        id={OPEN_SETTINGS_ID}
                                        className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20"
                                >
                                        <div className="w-8">
                                                <img width="16px" height="16px" src="./themes/Yaru/status/emblem-system-symbolic.svg" alt={ALT_SETTINGS} />
                                        </div>
                                        <div className="w-2/3 flex items-center justify-between">
                                                <span>{SETTINGS_LABEL}</span>
                                        </div>
                                </div>
                                <div
                                        onClick={this.props.lockScreen}
                                        className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20"
                                >
                                        <div className="w-8">
                                                <img width="16px" height="16px" src="./themes/Yaru/status/changes-prevent-symbolic.svg" alt={ALT_LOCK} />
                                        </div>
                                        <div className="w-2/3 flex items-center justify-between">
                                                <span>{LOCK_LABEL}</span>
                                        </div>
                                </div>
                                <div
                                        onClick={this.props.shutDown}
                                        className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20"
                                >
                                        <div className="w-8">
                                                <img width="16px" height="16px" src="./themes/Yaru/status/system-shutdown-symbolic.svg" alt={ALT_POWER} />
                                        </div>
                                        <div className="w-2/3 flex items-center justify-between">
                                                <span>{POWER_OFF_LABEL}</span>
                                                <SmallArrow angle="right" />
                                        </div>
                                </div>
			</div>
		);
	}
}

export default onClickOutside(StatusCard);

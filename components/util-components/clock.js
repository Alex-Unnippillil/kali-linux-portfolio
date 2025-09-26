import { Component } from 'react'

export default class Clock extends Component {
    constructor() {
        super();
        this.month_list = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        this.day_list = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        this.state = {
            hour_12: true,
            current_time: null
        };
    }

    componentDidMount() {
        const update = () => this.setState({ current_time: new Date() });
        update();
        if (typeof window !== 'undefined' && typeof Worker === 'function') {
            this.worker = new Worker(new URL('../../workers/timer.worker.mts', import.meta.url));
            this.worker.onmessage = update;
            this.worker.postMessage({ action: 'start', interval: 10 * 1000 });
        } else {
            this.update_time = setInterval(update, 10 * 1000);
        }
    }

    componentWillUnmount() {
        if (this.worker) {
            this.worker.postMessage({ action: 'stop' });
            this.worker.terminate();
        }
        if (this.update_time) clearInterval(this.update_time);
    }

    render() {
        const { current_time } = this.state;
        if (!current_time) return <span suppressHydrationWarning></span>;

        let day = this.day_list[current_time.getDay()];
        let hour = current_time.getHours();
        let minute = current_time.getMinutes();
        let month = this.month_list[current_time.getMonth()];
        let date = current_time.getDate().toLocaleString();
        let meridiem = (hour < 12 ? "AM" : "PM");

        if (minute.toLocaleString().length === 1) {
            minute = "0" + minute
        }

        if (this.state.hour_12 && hour > 12) hour -= 12;

        let display_time;
        if (this.props.onlyTime) {
            display_time = hour + ":" + minute + " " + meridiem;
        }
        else if (this.props.onlyDay) {
            display_time = day + " " + month + " " + date;
        }
        else display_time = day + " " + month + " " + date + " " + hour + ":" + minute + " " + meridiem;
        return <span suppressHydrationWarning>{display_time}</span>;
    }
}

import { Component } from 'react';

interface ClockProps {
  onlyTime?: boolean;
  onlyDay?: boolean;
}

interface ClockState {
  hour_12: boolean;
  current_time: Date;
}

export default class Clock extends Component<ClockProps, ClockState> {
  private month_list = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  private day_list = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  private update_time?: NodeJS.Timeout;

  constructor(props: ClockProps) {
    super(props);
    this.state = {
      hour_12: true,
      current_time: new Date(),
    };
  }

  componentDidMount(): void {
    this.update_time = setInterval(() => {
      this.setState({ current_time: new Date() });
    }, 10 * 1000);
  }

  componentWillUnmount(): void {
    if (this.update_time) clearInterval(this.update_time);
  }

  render(): JSX.Element {
    const { current_time } = this.state;

    let day = this.day_list[current_time.getDay()];
    let hour = current_time.getHours();
    const minute = current_time.getMinutes().toString().padStart(2, '0');
    let month = this.month_list[current_time.getMonth()];
    let date = current_time.getDate().toString();
    const meridiem = hour < 12 ? 'AM' : 'PM';

    if (this.state.hour_12 && hour > 12) hour -= 12;

    let display_time: string;
    if (this.props.onlyTime) {
      display_time = `${hour}:${minute} ${meridiem}`;
    } else if (this.props.onlyDay) {
      display_time = `${day} ${month} ${date}`;
    } else {
      display_time = `${day} ${month} ${date} ${hour}:${minute} ${meridiem}`;
    }

    return <span>{display_time}</span>;
  }
}

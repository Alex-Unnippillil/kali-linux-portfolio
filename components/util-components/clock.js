import { useEffect, useState } from 'react';

export default function Clock(props) {
  const month_list = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day_list = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [time, setTime] = useState(null);
  const hour12 = true;

  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);

  if (!time)
    return <span suppressHydrationWarning>{"--:--"}</span>;

  let day = day_list[time.getDay()];
  let hour = time.getHours();
  let minute = time.getMinutes();
  let month = month_list[time.getMonth()];
  let date = time.getDate().toLocaleString();
  let meridiem = hour < 12 ? "AM" : "PM";

  if (minute.toLocaleString().length === 1) {
    minute = "0" + minute;
  }

  if (hour12 && hour > 12) hour -= 12;

  let display_time;
  if (props.onlyTime) {
    display_time = hour + ":" + minute + " " + meridiem;
  } else if (props.onlyDay) {
    display_time = day + " " + month + " " + date;
  } else {
    display_time =
      day +
      " " +
      month +
      " " +
      date +
      " " +
      hour +
      ":" +
      minute +
      " " +
      meridiem;
  }
  return <span suppressHydrationWarning>{display_time}</span>;
}


import { useEffect, useState } from "react";
import { formatClockTime } from "../model";

/** Show the current local time in a fixed 24-hour format. */
export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const text = formatClockTime(now);
  return (
    <time aria-label={`Current time ${text}`} className="live-clock" dateTime={now.toISOString()}>
      {text}
    </time>
  );
}

import React, { useEffect, useState } from 'react';

interface CountUpProps {
  end: number;
  duration?: number; // duration in ms
  suffix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({ end, duration = 1000, suffix = '', className = '' }) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [end, duration]);

  return <span className={className}>{value}{suffix}</span>;
};

export default CountUp;

import { useState, useEffect } from 'react';
import { useLiveKitContext } from './LiveKitContext';

interface UseCallDurationReturn {
  duration: number;        // Total seconds
  formatted: string;       // MM:SS or HH:MM:SS
  startTime: number | null;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
}

export function useCallDuration(): UseCallDurationReturn {
  const { callStartTime } = useLiveKitContext();
  const [duration, setDuration] = useState<number>(0);

  // Update duration every second based on global start time
  useEffect(() => {
    if (!callStartTime) {
      setDuration(0);
      return;
    }

    // Calculate initial duration
    setDuration(Math.floor((Date.now() - callStartTime) / 1000));

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime]);

  return {
    duration,
    formatted: formatDuration(duration),
    startTime: callStartTime,
  };
}

import { MetricType } from '../types';

// "mm:ss", never negative.
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Target as shown to the user: reps as a number, seconds as a clock.
export function formatMetricTarget(value: number, metric: MetricType): string {
  return metric === 'seconds' ? formatClock(value) : String(value);
}

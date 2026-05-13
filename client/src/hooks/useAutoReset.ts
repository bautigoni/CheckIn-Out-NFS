import { useEffect, useRef } from 'react';

/**
 * Resets to home after `timeoutMs` of inactivity on a kiosk screen.
 * Disabled when `enabled` is false (e.g. on home or in admin routes).
 */
export function useAutoReset(onReset: () => void, enabled: boolean, timeoutMs = 7000): void {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(onReset, timeoutMs);
    };

    const events: (keyof WindowEventMap)[] = ['click', 'touchstart', 'mousemove', 'keydown'];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset));
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [onReset, enabled, timeoutMs]);
}

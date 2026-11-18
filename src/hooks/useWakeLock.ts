import { useEffect, useRef } from 'react';

export function useWakeLock(isActive: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // Если Wake Lock не поддерживается браузером или тренировка не активна — выходим
    if (!isActive || !('wakeLock' in navigator)) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      return;
    }

    let isMounted = true;

    const requestWakeLock = async () => {
      try {
        // Запрашиваем только если вкладка видима и блокировка ещё не активна
        if (document.visibilityState === 'visible' && !wakeLockRef.current) {
          const sentinel = await navigator.wakeLock.request('screen');
          if (!isMounted) {
            sentinel.release().catch(() => {});
            return;
          }
          wakeLockRef.current = sentinel;
          sentinel.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch {
        // Игнорируем ошибку (например, если на телефоне включён режим энергосбережения)
      }
    };

    requestWakeLock();

    // Повторно активируем удержание экрана, если пользователь свернул и развернул приложение
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isActive]);
}

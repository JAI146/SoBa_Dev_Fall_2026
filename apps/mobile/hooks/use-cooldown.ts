import { useCallback, useEffect, useState } from 'react';

export function useCooldown() {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  const startCooldown = useCallback((seconds: number) => {
    setSecondsRemaining((current) => Math.max(current, seconds));
  }, []);

  return {
    isCoolingDown: secondsRemaining > 0,
    secondsRemaining,
    startCooldown,
  };
}

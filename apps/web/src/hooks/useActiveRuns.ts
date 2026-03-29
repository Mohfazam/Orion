import { useEffect, useState, useRef } from 'react';
import { runsService } from '../services/runs.service';
import { Run } from '../types/orion';

export const useActiveRuns = (intervalMs = 5000) => {
  const [activeRuns, setActiveRuns] = useState<Run[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let isMounted = true;

    const fetchActiveRuns = async () => {
      try {
        const runs = await runsService.getActiveRuns();
        if (isMounted) {
          setActiveRuns(runs);
          setError(null);
          timeoutRef.current = setTimeout(fetchActiveRuns, intervalMs);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch active runs'));
          timeoutRef.current = setTimeout(fetchActiveRuns, intervalMs * 2);
        }
      }
    };

    fetchActiveRuns();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [intervalMs]);

  return { activeRuns, error };
};

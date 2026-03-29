import { useEffect, useState, useRef } from 'react';
import { runsService } from '../services/runs.service';
import { RunStatus } from '../types/orion';

export const usePolling = (runId: string, enabled: boolean) => {
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    
    if (!runId || !enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const poll = async () => {
      try {
        const result = await runsService.getRunStatus(runId);
        if (isMounted) {
          setStatus(result.status);
          
          if (result.status === 'queued' || result.status === 'running') {
            timeoutRef.current = setTimeout(poll, 3000);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to poll status'));
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [runId, enabled]);

  return { status, error };
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { extendFetch } from './extendFetch';

export type RebuildJob = {
  status: string;
  jobId?: string;
  queuedAt?: string;
  startedAt?: string;
  builtAt?: string;
  reloadedAt?: string;
  message?: string;
  logTail?: string;
};

type Phase =
  | 'idle'
  | 'queued'
  | 'started'
  | 'building'
  | 'swapping'
  | 'reloading'
  | 'succeeded'
  | 'failed'
  | 'unsupported'
  | 'reload_error';

const RELOAD_ERROR = 'error: reload did not come back on this build';

async function fetchStamp(): Promise<{
  jobId: string;
  builtAt: string;
} | null> {
  try {
    const res = await fetch(`${window.location.origin}/api/extend/stamp`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function RebuildModal({
  open,
  jobId,
  sysopToken,
  onClose,
  onRebuild,
}: {
  open: boolean;
  jobId: string | null;
  sysopToken: string | null;
  onClose: () => void;
  onRebuild: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [job, setJob] = useState<RebuildJob | null>(null);
  const [clock, setClock] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const reloadedAtRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const pollJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await extendFetch(`/api/v1/extend/rebuild/${jobId}`, {
        sysopToken,
      });
      if (!res.ok) {
        setError(`job ${res.status}`);
        return;
      }
      const data = (await res.json()) as RebuildJob;
      setJob(data);
      const st = data.status as Phase;
      if (st === 'unsupported') {
        setPhase('unsupported');
        return;
      }
      if (st === 'failed') {
        setPhase('failed');
        return;
      }
      if (st === 'succeeded') {
        if (data.reloadedAt) reloadedAtRef.current = data.reloadedAt;
        setPhase('reloading');
        return;
      }
      if (
        st === 'queued' ||
        st === 'started' ||
        st === 'building' ||
        st === 'swapping' ||
        st === 'reloading'
      ) {
        setPhase(st);
      }
    } catch (e) {
      // During reloading, tolerate connection errors (502 window).
      if (phase !== 'reloading' && phase !== 'swapping') {
        setError(e instanceof Error ? e.message : 'job poll failed');
      }
    }
  }, [jobId, sysopToken, phase]);

  useEffect(() => {
    if (!open || !jobId) return;
    setPhase('queued');
    setJob(null);
    setError(null);
    reloadedAtRef.current = null;
    startedAtRef.current = Date.now();
  }, [open, jobId]);

  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => {
      setClock(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open || !jobId) return;
    if (
      phase === 'succeeded' ||
      phase === 'failed' ||
      phase === 'unsupported' ||
      phase === 'reload_error'
    ) {
      return;
    }
    void pollJob();
    const t = window.setInterval(() => void pollJob(), 2000);
    return () => window.clearInterval(t);
  }, [open, jobId, phase, pollJob]);

  // After job succeeded / while reloading: poll stamp every 2s.
  useEffect(() => {
    if (!open || !jobId) return;
    if (phase !== 'reloading' && phase !== 'succeeded') return;

    let cancelled = false;
    const tick = async () => {
      const stamp = await fetchStamp();
      if (cancelled) return;
      if (stamp?.jobId === jobId) {
        setPhase('succeeded');
        return;
      }
      const reloadedAt = reloadedAtRef.current;
      if (reloadedAt) {
        const t = Date.parse(reloadedAt);
        if (!Number.isNaN(t) && Date.now() - t > 120_000) {
          setPhase('reload_error');
          setError(RELOAD_ERROR);
        }
      }
    };
    void tick();
    const iv = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [open, jobId, phase]);

  if (!open) return null;

  const mm = String(Math.floor(clock / 60)).padStart(2, '0');
  const ss = String(clock % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto border border-black/20 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-action text-lg">Rebuild site</h2>
          <span className="font-mono text-sm text-black/60">
            {mm}:{ss}
          </span>
        </div>

        <p className="mb-2 text-sm">
          Phase:{' '}
          <span className="font-bold">
            {phase === 'reload_error' ? 'error' : phase}
          </span>
          {jobId ? (
            <span className="ml-2 font-mono text-xs text-black/50">
              {jobId}
            </span>
          ) : null}
        </p>

        {(phase === 'building' || phase === 'failed') && job?.logTail ? (
          <pre className="mb-3 max-h-64 overflow-auto bg-black/5 p-2 text-xs">
            {job.logTail}
          </pre>
        ) : null}

        {phase === 'unsupported' ? (
          <p className="mb-3 border border-amber-300 bg-amber-50 p-2 text-sm text-amber-950">
            {job?.message ||
              'installed concierge does not handle rebuild-frontend; replace /home/t8k/scripts/t8k-concierge.sh by hand'}
          </p>
        ) : null}

        {phase === 'reload_error' || error ? (
          <p className="mb-3 border border-red-300 bg-red-50 p-2 text-sm text-red-900">
            {error || RELOAD_ERROR}
          </p>
        ) : null}

        {phase === 'succeeded' ? (
          <p className="mb-3 border border-green-300 bg-green-50 p-2 text-sm text-green-900">
            Rebuild succeeded
            {job?.builtAt ? ` · ${job.builtAt}` : ''}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border border-black/20 bg-white px-3 py-1.5 text-sm font-bold"
            onClick={onClose}
          >
            Dismiss
          </button>
          {(phase === 'failed' ||
            phase === 'unsupported' ||
            phase === 'reload_error' ||
            phase === 'succeeded') && (
            <button
              type="button"
              className="bg-black px-3 py-1.5 text-sm font-bold text-white"
              onClick={onRebuild}
            >
              Rebuild
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

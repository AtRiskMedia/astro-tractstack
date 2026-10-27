import { useState, type FormEvent } from 'react';
import { extendFetch } from './extendFetch';

export default function SysopLoginCard({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await extendFetch('/api/sysop/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        setError(data.error || `Login failed (${res.status})`);
        return;
      }
      onToken(data.token as string);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 border border-black/10 p-4">
      <h2 className="font-action text-lg">SysOp login</h2>
      <p className="mt-1 text-sm text-black/70">
        Multi-tenant source editing requires a SysOp token. This does not use
        the Storykeep admin cookie or tenant-token JWT.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-black/20 px-2 py-1"
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !password}
          className="bg-myblack px-3 py-1.5 text-white disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

import { useState } from 'react';
import { extendFetch } from './extendFetch';

const IMAGE_EXT = /\.(webp|png|jpe?g|gif|svg)$/i;
const AUDIO_EXT = /\.(mp3|ogg|wav)$/i;

export default function AssetPreview({
  path,
  size,
  mtime,
  onDeleted,
  onReplaced,
}: {
  path: string;
  size?: number;
  mtime?: string;
  onDeleted: () => void;
  onReplaced: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/custom/${path}`;
  const isImage = IMAGE_EXT.test(path);
  const isAudio = AUDIO_EXT.test(path);

  async function remove() {
    if (!confirm(`Delete /custom/${path}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await extendFetch(
        `/api/v1/extend/assets/file?path=${encodeURIComponent(path)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Delete failed (${res.status})`);
        return;
      }
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function replace(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file, path);
      const res = await extendFetch('/api/v1/extend/assets/upload', {
        method: 'POST',
        body: fd,
        headers: {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Replace failed (${res.status})`);
        return;
      }
      onReplaced();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Replace failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-black/10 p-4">
      <h3 className="font-action text-lg">/custom/{path}</h3>
      <p className="mt-1 text-sm text-black/60">
        {size != null ? `${size} bytes` : ''}
        {mtime ? ` · ${mtime}` : ''}
        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-900">
          live
        </span>
      </p>
      <div className="mt-4">
        {isImage && (
          <img src={url} alt={path} className="max-h-96 max-w-full" />
        )}
        {isAudio && <audio controls src={url} className="w-full" />}
        {!isImage && !isAudio && (
          <p className="text-sm text-black/60">
            Preview not available for this type. Use Replace or Delete.
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="cursor-pointer bg-black/10 px-3 py-1.5 text-sm">
          Replace
          <input
            type="file"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void replace(f);
              e.target.value = '';
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="bg-red-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

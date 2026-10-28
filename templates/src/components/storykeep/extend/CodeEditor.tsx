import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';

export type EditorTab = {
  key: string;
  path: string;
  content: string;
  /** Content last loaded or successfully saved — dirty iff content !== baseline. */
  baseline: string;
  dirty: boolean;
  kind: 'source' | 'asset';
};

function extensionsFor(path: string) {
  const lower = path.toLowerCase();
  if (
    lower.endsWith('.astro') ||
    lower.endsWith('.html') ||
    lower.endsWith('.svg')
  ) {
    return [html(), EditorView.lineWrapping];
  }
  if (lower.endsWith('.css')) {
    return [css(), EditorView.lineWrapping];
  }
  if (lower.endsWith('.json')) {
    return [json(), EditorView.lineWrapping];
  }
  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.mjs')
  ) {
    return [
      javascript({
        jsx: lower.endsWith('.tsx') || lower.endsWith('.jsx'),
        typescript: lower.endsWith('.ts') || lower.endsWith('.tsx'),
      }),
      EditorView.lineWrapping,
    ];
  }
  return [EditorView.lineWrapping];
}

export default function CodeEditor({
  tabs,
  activeKey,
  onSelect,
  onChange,
  onClose,
}: {
  tabs: EditorTab[];
  activeKey: string | null;
  onSelect: (key: string) => void;
  onChange: (key: string, content: string) => void;
  onClose: (key: string) => void;
}) {
  const active = tabs.find((t) => t.key === activeKey) || null;
  const exts = useMemo(
    () => (active ? extensionsFor(active.path) : []),
    [active?.path]
  );

  if (!active) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center border border-black/10 text-sm text-black/50">
        Select a file to edit
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[24rem] flex-col border border-black/10">
      <div className="flex flex-wrap items-center gap-1 border-b border-black/10 bg-black/5 px-1 py-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onSelect(t.key)}
            className={`flex items-center gap-1 px-2 py-1 text-sm ${
              t.key === activeKey ? 'bg-white' : 'hover:bg-white/60'
            }`}
          >
            <span>
              {t.path.split('/').pop()}
              {t.dirty ? ' •' : ''}
            </span>
            <span
              role="button"
              tabIndex={0}
              className="text-black/40 hover:text-black"
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.key);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  onClose(t.key);
                }
              }}
            >
              ×
            </span>
          </button>
        ))}
      </div>
      <CodeMirror
        value={active.content}
        height="100%"
        className="min-h-[22rem] flex-1 text-sm"
        extensions={exts}
        onChange={(v) => onChange(active.key, v)}
      />
    </div>
  );
}

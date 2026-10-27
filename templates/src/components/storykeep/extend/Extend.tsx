import { useCallback, useEffect, useMemo, useState } from 'react';
import { extendFetch, getTenantId } from './extendFetch';
import SysopLoginCard from './SysopLoginCard';
import ExtendTree, {
  type Registry,
  type TreeNode,
} from './ExtendTree';
import ExtendEditorModal from './ExtendEditorModal';
import ExtendPublishBar from './ExtendPublishBar';
import type { EditorTab } from './CodeEditor';
import type { FormStateReturn, SaveState } from '@/hooks/useFormState';

const TEXT_ASSET = /\.(js|css|json|txt|md|html|svg|csv)$/i;

/** Invariant 3 — mirror Go CoreBladeIDs; never list as registry rows. */
const CORE_HOOK_IDS = new Set([
  'featured-article',
  'list-content',
  'search-widget',
  'bunny-video',
  'epinet',
  '[...hookId]',
]);

type EditorForm = { content: string };

export default function Extend({
  isMultiTenant,
  isDev,
}: {
  isMultiTenant: boolean;
  isDev: boolean;
}) {
  const [sysopToken, setSysopToken] = useState<string | null>(null);
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [sourceNodes, setSourceNodes] = useState<TreeNode[]>([]);
  const [assetNodes, setAssetNodes] = useState<TreeNode[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    path: string;
    size?: number;
    mtime?: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingPublish, setPendingPublish] = useState(false);
  const [probeWarn, setProbeWarn] = useState<string | null>(null);

  const sourceReady = !isMultiTenant || !!sysopToken;
  const sourceBadge = isDev
    ? 'live (dev)'
    : 'saved · publish via sysop build until Phase 4';

  const activeTab =
    tabs.find((t) => t.key === activeKey) || tabs[0] || null;

  const loadAssets = useCallback(async () => {
    const res = await extendFetch('/api/v1/extend/assets/tree');
    if (!res.ok) throw new Error(`assets/tree ${res.status}`);
    const data = await res.json();
    setAssetNodes(data.tree || []);
  }, []);

  const loadSource = useCallback(async () => {
    if (!sourceReady) return;
    const regRes = await extendFetch('/api/v1/extend/source/registry', {
      sysopToken,
    });
    if (!regRes.ok) throw new Error(`source/registry ${regRes.status}`);
    const reg = await regRes.json();
    setRegistry({
      ...reg,
      hooks: (reg.hooks || []).filter(
        (h: { id: string }) => !CORE_HOOK_IDS.has(h.id)
      ),
    });

    const treeRes = await extendFetch('/api/v1/extend/source/tree', {
      sysopToken,
    });
    if (!treeRes.ok) throw new Error(`source/tree ${treeRes.status}`);
    const treeData = await treeRes.json();
    setSourceNodes(treeData.tree || []);
  }, [sourceReady, sysopToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        await loadAssets();
        if (sourceReady) await loadSource();
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAssets, loadSource, sourceReady]);

  useEffect(() => {
    if (!isMultiTenant) return;
    const tid = getTenantId();
    if (!tid) return;
    const marker = `t8k-probe-${tid}`;
    fetch(`/custom/${marker}`, { method: 'HEAD' })
      .then((r) => {
        if (r.status === 404) {
          setProbeWarn(
            `nginx /custom/ on this host does not serve this tenant’s directory (Go writes config/${tid}/custom).`
          );
        } else {
          setProbeWarn(null);
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, [isMultiTenant]);

  function requestCloseModal() {
    setTabs([]);
    setActiveKey(null);
    setPreview(null);
    setModalOpen(false);
    setSaveState('idle');
    setSaveError(null);
  }

  const saveActiveTab = useCallback(async () => {
    const tab = tabs.find((t) => t.key === (activeKey || tabs[0]?.key));
    if (!tab || !tab.dirty) return;
    setSaveState('saving');
    setSaveError(null);
    setError(null);
    const endpoint =
      tab.kind === 'source'
        ? '/api/v1/extend/source/file'
        : '/api/v1/extend/assets/file';
    const res = await extendFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ path: tab.path, content: tab.content }),
      sysopToken: tab.kind === 'source' ? sysopToken : null,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error || `Save failed (${res.status})`;
      setSaveError(msg);
      setSaveState('error');
      throw new Error(msg);
    }
    setTabs((prev) =>
      prev.map((t) =>
        t.key === tab.key ? { ...t, baseline: t.content, dirty: false } : t
      )
    );
    setSaveState('success');
    if (tab.kind === 'source') {
      setPendingPublish(true);
    }
    window.setTimeout(() => setSaveState('idle'), 2000);
  }, [tabs, activeKey, sysopToken, isDev]);

  const discardActiveTab = useCallback(() => {
    const key = activeKey || tabs[0]?.key;
    if (!key) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.key === key
          ? { ...t, content: t.baseline, dirty: false }
          : t
      )
    );
    setSaveState('idle');
    setSaveError(null);
  }, [activeKey, tabs]);

  const editorFormState: FormStateReturn<EditorForm> | null = useMemo(() => {
    if (!activeTab) return null;
    return {
      state: { content: activeTab.content },
      originalState: { content: activeTab.baseline },
      updateField: () => {},
      save: saveActiveTab,
      cancel: discardActiveTab,
      resetToState: () => {},
      isDirty: activeTab.dirty,
      isValid: true,
      errors: {},
      saveState,
      errorMessage: saveError,
    };
  }, [activeTab, saveActiveTab, discardActiveTab, saveState, saveError]);

  async function openSource(path: string, tooLarge?: boolean) {
    if (tooLarge) {
      setError(`${path} exceeds 2 MiB`);
      return;
    }
    const existing = tabs.find((t) => t.key === `source:${path}`);
    if (existing) {
      setPreview(null);
      setActiveKey(existing.key);
      setSaveState('idle');
      setSaveError(null);
      setModalOpen(true);
      return;
    }
    setError(null);
    const res = await extendFetch(
      `/api/v1/extend/source/file?path=${encodeURIComponent(path)}`,
      { sysopToken }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Failed to open ${path}`);
      return;
    }
    const data = await res.json();
    const content = data.content ?? '';
    const key = `source:${path}`;
    setPreview(null);
    setTabs((prev) => [
      ...prev,
      {
        key,
        path,
        content,
        baseline: content,
        dirty: false,
        kind: 'source',
      },
    ]);
    setActiveKey(key);
    setSaveState('idle');
    setSaveError(null);
    setModalOpen(true);
  }

  async function openAsset(
    path: string,
    meta?: { size?: number; mtime?: string }
  ) {
    if (TEXT_ASSET.test(path)) {
      setPreview(null);
      const existing = tabs.find((t) => t.key === `asset:${path}`);
      if (existing) {
        setActiveKey(existing.key);
        setSaveState('idle');
        setSaveError(null);
        setModalOpen(true);
        return;
      }
      const res = await extendFetch(
        `/api/v1/extend/assets/file?path=${encodeURIComponent(path)}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to open asset ${path}`);
        return;
      }
      const data = await res.json();
      const content = data.content ?? '';
      const key = `asset:${path}`;
      setTabs((prev) => [
        ...prev,
        {
          key,
          path,
          content,
          baseline: content,
          dirty: false,
          kind: 'asset',
        },
      ]);
      setActiveKey(key);
      setSaveState('idle');
      setSaveError(null);
      setModalOpen(true);
      return;
    }
    setTabs([]);
    setActiveKey(null);
    setPreview({ path, size: meta?.size, mtime: meta?.mtime });
    setModalOpen(true);
  }

  async function uploadFiles(files: FileList, asDirectory: boolean) {
    const fd = new FormData();
    Array.from(files).forEach((f) => {
      const rel =
        asDirectory &&
        (f as File & { webkitRelativePath?: string }).webkitRelativePath
          ? (f as File & { webkitRelativePath: string }).webkitRelativePath
          : f.name;
      fd.append('file', f, rel);
    });
    setError(null);
    const res = await extendFetch('/api/v1/extend/assets/upload', {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Upload failed (${res.status})`);
      return;
    }
    await loadAssets();
  }

  function closeTab(key: string) {
    const next = tabs.filter((t) => t.key !== key);
    setTabs(next);
    if (next.length === 0 && !preview) {
      setActiveKey(null);
      setModalOpen(false);
      setSaveState('idle');
      setSaveError(null);
      return;
    }
    if (activeKey === key) {
      setActiveKey(next[0]?.key ?? null);
    }
  }

  return (
    <div className="mt-4 pb-24">
      {isMultiTenant && !sysopToken && (
        <SysopLoginCard onToken={setSysopToken} />
      )}
      {probeWarn && (
        <p className="mb-3 border border-amber-600 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {probeWarn}
        </p>
      )}
      {error && (
        <p className="mb-3 border border-red-700 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
      <div className="max-w-xl">
        <ExtendTree
          showSource={sourceReady}
          showBuild={sourceReady}
          pendingPublish={pendingPublish}
          sourceNodes={sourceNodes}
          assetNodes={assetNodes}
          registry={registry}
          sourceBadge={sourceBadge}
          onSelect={(sel) => {
            if (!sel) return;
            if (sel.kind === 'source') {
              void openSource(sel.path, sel.tooLarge);
            } else if (!sel.isDir) {
              void openAsset(sel.path, {
                size: sel.size,
                mtime: sel.mtime,
              });
            }
          }}
          onUploadFiles={(files, asDir) => void uploadFiles(files, asDir)}
        />
      </div>

      <ExtendEditorModal
        open={modalOpen}
        onClose={requestCloseModal}
        tabs={tabs}
        activeKey={activeKey}
        preview={preview}
        editorFormState={editorFormState}
        onSelectTab={(key) => {
          setActiveKey(key);
          setSaveState('idle');
          setSaveError(null);
        }}
        onChangeTab={(key, content) => {
          if (saveState !== 'idle') {
            setSaveState('idle');
            setSaveError(null);
          }
          setTabs((prev) =>
            prev.map((t) => {
              if (t.key !== key) return t;
              const dirty = content !== t.baseline;
              return { ...t, content, dirty };
            })
          );
        }}
        onCloseTab={closeTab}
        onPreviewDeleted={() => {
          setPreview(null);
          setModalOpen(false);
          void loadAssets();
        }}
        onPreviewReplaced={() => void loadAssets()}
      />

      <ExtendPublishBar
        show={pendingPublish && !modalOpen}
        isDev={isDev}
        onDismiss={() => setPendingPublish(false)}
      />
    </div>
  );
}

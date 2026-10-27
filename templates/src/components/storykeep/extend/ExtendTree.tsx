import { useMemo, useState } from 'react';

export type TreeNode = {
  name: string;
  path: string;
  size: number;
  mtime: string;
  isDir: boolean;
  flag?: string;
  tooLarge?: boolean;
};

export type RegistryHook = {
  id: string;
  kind: string;
  blade: string | null;
  files: string[];
  origin: string;
};

export type RegistryRoute = {
  name: string;
  enabled: boolean;
  shell: string;
  origin: string;
  shellMode: string;
};

export type Registry = {
  hooks: RegistryHook[];
  routes: RegistryRoute[];
  manifest?: { file: string; mode: string };
  dispatcher?: { file: string; mode: string };
};

type Selection =
  | { kind: 'source'; path: string; tooLarge?: boolean }
  | { kind: 'asset'; path: string; size?: number; mtime?: string; isDir: boolean }
  | null;

function buildChildren(nodes: TreeNode[], parentPath: string): TreeNode[] {
  const prefix = parentPath ? parentPath + '/' : '';
  return nodes.filter((n) => {
    if (!n.path.startsWith(prefix) && parentPath !== '') return false;
    if (parentPath === '' && n.path.includes('/')) {
      // top-level under a virtual root: first segment only handled by caller
    }
    const rest = parentPath ? n.path.slice(prefix.length) : n.path;
    return rest.length > 0 && !rest.includes('/');
  });
}

function Folder({
  label,
  nodes,
  rootPrefix,
  badge,
  onOpenFile,
  depth = 0,
}: {
  label: string;
  nodes: TreeNode[];
  rootPrefix: string;
  badge?: (n: TreeNode) => string | null;
  onOpenFile: (n: TreeNode) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  const children = useMemo(
    () => buildChildren(nodes, rootPrefix),
    [nodes, rootPrefix]
  );

  return (
    <div style={{ marginLeft: depth ? 12 : 0 }}>
      <button
        type="button"
        className="flex w-full items-center gap-1 py-0.5 text-left text-sm hover:bg-black/5"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="w-3 shrink-0">{open ? '▾' : '▸'}</span>
        <span className="font-bold">{label}</span>
      </button>
      {open &&
        children.map((n) =>
          n.isDir ? (
            <Folder
              key={n.path}
              label={n.name}
              nodes={nodes}
              rootPrefix={n.path}
              badge={badge}
              onOpenFile={onOpenFile}
              depth={depth + 1}
            />
          ) : (
            <button
              key={n.path}
              type="button"
              className="flex w-full items-center gap-1 py-0.5 pl-4 text-left text-sm hover:bg-black/5"
              style={{ marginLeft: 12 }}
              onClick={() => onOpenFile(n)}
            >
              <span className="truncate">{n.name}</span>
              {n.flag ? (
                <span className="shrink-0 text-xs text-black/40">{n.flag}</span>
              ) : null}
              {badge?.(n) ? (
                <span className="shrink-0 text-xs text-amber-800">
                  {badge(n)}
                </span>
              ) : null}
            </button>
          )
        )}
    </div>
  );
}

export default function ExtendTree({
  showSource,
  showBuild,
  pendingPublish,
  sourceNodes,
  assetNodes,
  registry,
  sourceBadge,
  onSelect,
  onUploadFiles,
}: {
  showSource: boolean;
  showBuild: boolean;
  pendingPublish: boolean;
  sourceNodes: TreeNode[];
  assetNodes: TreeNode[];
  registry: Registry | null;
  sourceBadge: string;
  onSelect: (sel: Selection) => void;
  onUploadFiles: (files: FileList, asDirectory: boolean) => void;
}) {
  const [sourceOpen, setSourceOpen] = useState(true);
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [buildOpen, setBuildOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);

  return (
    <div className="border border-black/10 p-2 text-sm">
      {showSource && (
        <div className="mb-2">
          <button
            type="button"
            className="mb-1 flex w-full items-center gap-1 font-action text-base"
            onClick={() => setSourceOpen((o) => !o)}
          >
            <span>{sourceOpen ? '▾' : '▸'}</span> Source
          </button>
          {sourceOpen && (
            <div className="pl-2">
              <div className="mb-1 text-xs font-bold uppercase text-black/50">
                Registry
              </div>
              {registry?.manifest && (
                <button
                  type="button"
                  className="block w-full truncate py-0.5 text-left hover:bg-black/5"
                  onClick={() =>
                    onSelect({
                      kind: 'source',
                      path: registry.manifest!.file,
                    })
                  }
                >
                  codehooks.ts ({registry.manifest.mode})
                </button>
              )}
              {registry?.dispatcher && (
                <button
                  type="button"
                  className="block w-full truncate py-0.5 text-left hover:bg-black/5"
                  onClick={() =>
                    onSelect({
                      kind: 'source',
                      path: registry.dispatcher!.file,
                    })
                  }
                >
                  CustomRoutes.astro ({registry.dispatcher.mode})
                </button>
              )}
              <button
                type="button"
                className="block w-full truncate py-0.5 text-left hover:bg-black/5"
                onClick={() =>
                  onSelect({
                    kind: 'source',
                    path: 'src/custom/HeaderWidget.astro',
                  })
                }
              >
                HeaderWidget.astro
              </button>
              {(registry?.hooks || []).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="block w-full truncate py-0.5 pl-2 text-left hover:bg-black/5"
                  onClick={() => {
                    if (h.blade) {
                      onSelect({ kind: 'source', path: h.blade });
                    }
                  }}
                  title={h.kind}
                >
                  hook:{h.id}
                  {!h.blade ? ' (no blade)' : ''}
                  <span className="ml-1 text-xs text-amber-800">
                    {sourceBadge}
                  </span>
                </button>
              ))}
              {(registry?.routes || []).map((r) => (
                <button
                  key={r.name}
                  type="button"
                  className="block w-full truncate py-0.5 pl-2 text-left hover:bg-black/5"
                  onClick={() =>
                    onSelect({ kind: 'source', path: r.shell })
                  }
                >
                  route:{r.name}
                  <span className="ml-1 text-xs text-amber-800">
                    {sourceBadge}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className="mt-2 mb-1 flex w-full items-center gap-1 text-xs font-bold uppercase text-black/50"
                onClick={() => setFilesOpen((o) => !o)}
              >
                <span>{filesOpen ? '▾' : '▸'}</span> Files
              </button>
              {filesOpen && (
                <Folder
                  label="src"
                  nodes={sourceNodes}
                  rootPrefix="src"
                  badge={(n) => (!n.isDir ? sourceBadge : null)}
                  onOpenFile={(n) =>
                    onSelect({
                      kind: 'source',
                      path: n.path,
                      tooLarge: n.tooLarge,
                    })
                  }
                />
              )}
            </div>
          )}
        </div>
      )}

      <div className="mb-2">
        <button
          type="button"
          className="mb-1 flex w-full items-center gap-1 font-action text-base"
          onClick={() => setAssetsOpen((o) => !o)}
        >
          <span>{assetsOpen ? '▾' : '▸'}</span> Assets
          <span className="ml-1 text-xs font-normal text-green-800">live</span>
        </button>
        {assetsOpen && (
          <div className="pl-2">
            <div className="mb-2 flex flex-wrap gap-1">
              <label className="cursor-pointer bg-black/10 px-2 py-0.5 text-xs">
                Upload files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length)
                      onUploadFiles(e.target.files, false);
                    e.target.value = '';
                  }}
                />
              </label>
              <label className="cursor-pointer bg-black/10 px-2 py-0.5 text-xs">
                Upload folder
                <input
                  type="file"
                  // @ts-expect-error webkitdirectory
                  webkitdirectory=""
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length)
                      onUploadFiles(e.target.files, true);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <Folder
              label="/custom"
              nodes={assetNodes}
              rootPrefix=""
              onOpenFile={(n) =>
                onSelect({
                  kind: 'asset',
                  path: n.path,
                  size: n.size,
                  mtime: n.mtime,
                  isDir: false,
                })
              }
            />
          </div>
        )}
      </div>

      {showBuild && (
        <div>
          <button
            type="button"
            className="mb-1 flex w-full items-center gap-1 font-action text-base"
            onClick={() => setBuildOpen((o) => !o)}
          >
            <span>{buildOpen ? '▾' : '▸'}</span> Build
            {pendingPublish ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                pending
              </span>
            ) : null}
          </button>
          {buildOpen && (
            <div className="pl-4 text-xs text-black/60">
              {pendingPublish ? (
                <p className="border border-amber-200 bg-amber-50 p-2 font-bold text-amber-900">
                  Source files were saved this session. They are not in the
                  running bundle until you publish via the sysop build.
                </p>
              ) : (
                <p>
                  Publishing arrives with a later platform update; until then
                  publish via the sysop build
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

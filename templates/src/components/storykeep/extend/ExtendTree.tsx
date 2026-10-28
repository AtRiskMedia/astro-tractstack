import { useMemo, useState, type ReactNode } from 'react';
import ArchiveBoxIcon from '@heroicons/react/24/outline/ArchiveBoxIcon';
import ArrowUpTrayIcon from '@heroicons/react/24/outline/ArrowUpTrayIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import CodeBracketIcon from '@heroicons/react/24/outline/CodeBracketIcon';
import DocumentIcon from '@heroicons/react/24/outline/DocumentIcon';
import DocumentPlusIcon from '@heroicons/react/24/outline/DocumentPlusIcon';
import DocumentTextIcon from '@heroicons/react/24/outline/DocumentTextIcon';
import FolderIcon from '@heroicons/react/24/outline/FolderIcon';
import FolderPlusIcon from '@heroicons/react/24/outline/FolderPlusIcon';
import RectangleGroupIcon from '@heroicons/react/24/outline/RectangleGroupIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';

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
  shell: string;
  view?: string;
  origin: string;
  shellMode: string;
};

export type Registry = {
  hooks: RegistryHook[];
  routes: RegistryRoute[];
  manifest?: { file: string; mode: string };
};

export type HookUsageRow = {
  paneId: string;
  paneTitle: string;
  isContextPane: boolean;
  storyFragmentId?: string;
  storyFragmentSlug?: string;
};

type Selection =
  | { kind: 'source'; path: string; tooLarge?: boolean }
  | { kind: 'asset'; path: string; size?: number; mtime?: string; isDir: boolean }
  | null;

function buildChildren(nodes: TreeNode[], parentPath: string): TreeNode[] {
  const prefix = parentPath ? parentPath + '/' : '';
  return nodes.filter((n) => {
    if (!n.path.startsWith(prefix) && parentPath !== '') return false;
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
  onSelectDir,
  selectedDir,
  selectedFile,
  depth = 0,
  selectableDirs = false,
}: {
  label: string;
  nodes: TreeNode[];
  rootPrefix: string;
  badge?: (n: TreeNode) => string | null;
  onOpenFile: (n: TreeNode) => void;
  onSelectDir?: (path: string) => void;
  selectedDir?: string;
  selectedFile?: string | null;
  depth?: number;
  selectableDirs?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const children = useMemo(
    () => buildChildren(nodes, rootPrefix),
    [nodes, rootPrefix]
  );
  const isSelectedDir =
    selectableDirs && selectedDir === rootPrefix;

  return (
    <div style={{ marginLeft: depth ? 12 : 0 }}>
      <button
        type="button"
        className={`flex w-full items-center gap-1 py-0.5 text-left text-sm hover:bg-black/5 ${
          isSelectedDir ? 'bg-black/10' : ''
        }`}
        onClick={() => {
          if (selectableDirs && onSelectDir) {
            onSelectDir(rootPrefix);
            setOpen(true);
          } else {
            setOpen((o) => !o);
          }
        }}
      >
        {open ? (
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
        )}
        <FolderIcon className="h-3.5 w-3.5 shrink-0 text-black/60" />
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
              onSelectDir={onSelectDir}
              selectedDir={selectedDir}
              selectedFile={selectedFile}
              depth={depth + 1}
              selectableDirs={selectableDirs}
            />
          ) : (
            <button
              key={n.path}
              type="button"
              className={`flex w-full items-center gap-1 py-0.5 pl-4 text-left text-sm hover:bg-black/5 ${
                selectedFile === n.path ? 'bg-black/10' : ''
              }`}
              style={{ marginLeft: 12 }}
              onClick={() => onOpenFile(n)}
            >
              <DocumentIcon className="h-3.5 w-3.5 shrink-0 text-black/50" />
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

function PairOpenButton({
  label,
  path,
  icon,
  onOpen,
}: {
  label: string;
  path: string | null | undefined;
  icon: ReactNode;
  onOpen: (path: string) => void;
}) {
  const disabled = !path;
  return (
    <button
      type="button"
      disabled={disabled}
      title={path || `${label} missing`}
      className="inline-flex items-center gap-0.5 text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
      onClick={() => {
        if (path) onOpen(path);
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function ExtendTree({
  showSource,
  showBuild,
  pendingPublish,
  sourceNodes,
  assetNodes,
  registry,
  onSelect,
  onUploadFiles,
  onAddHook,
  onRemoveHook,
  onAddRoute,
  onRemoveRoute,
  registryNotice,
  selectedDir,
  selectedZip,
  selectedFile,
  canDeleteAsset,
  onSelectAssetDir,
  onMkdir,
  onExpandZip,
  onDeleteAsset,
  selectedSourceDir,
  onSelectSourceDir,
  onCreateSourceFile,
}: {
  showSource: boolean;
  showBuild: boolean;
  pendingPublish: boolean;
  sourceNodes: TreeNode[];
  assetNodes: TreeNode[];
  registry: Registry | null;
  onSelect: (sel: Selection) => void;
  onUploadFiles: (files: FileList, asDirectory: boolean) => void;
  onAddHook: (id: string, kind: 'astro' | 'astro+jsx') => void;
  onRemoveHook: (id: string) => void;
  onAddRoute: (name: string) => void;
  onRemoveRoute: (name: string) => void;
  registryNotice: string | null;
  selectedDir: string;
  selectedZip: string | null;
  selectedFile: string | null;
  canDeleteAsset: boolean;
  onSelectAssetDir: (path: string) => void;
  onMkdir: () => void;
  onExpandZip: () => void;
  onDeleteAsset: () => void;
  selectedSourceDir: string;
  onSelectSourceDir: (path: string) => void;
  onCreateSourceFile: () => void;
}) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [hooksOpen, setHooksOpen] = useState(false);
  const [routesOpen, setRoutesOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [hookId, setHookId] = useState('');
  const [hookKind, setHookKind] = useState<'astro' | 'astro+jsx'>('astro');
  const [routeName, setRouteName] = useState('');

  const targetLabel = selectedDir ? `/custom/${selectedDir}` : '/custom';

  function openSourcePath(path: string) {
    onSelect({ kind: 'source', path });
  }

  return (
    <div className="border border-black/10 p-2 text-sm">
      {showSource && (
        <div className="mb-2">
          <button
            type="button"
            className="mb-1 flex w-full items-center gap-1 font-action text-base"
            onClick={() => setSourceOpen((o) => !o)}
          >
            {sourceOpen ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}{' '}
            Source
          </button>
          {sourceOpen && (
            <div className="pl-2">
              {registryNotice && (
                <p className="mb-2 border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-950">
                  {registryNotice}
                </p>
              )}

              <div className="mb-2">
                <button
                  type="button"
                  className="mb-1 flex w-full items-center gap-1 font-action text-base"
                  onClick={() => setHooksOpen((o) => !o)}
                >
                  {hooksOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}{' '}
                  Hooks
                </button>
                {hooksOpen && (
                  <div className="pl-2">
                    <div className="mb-2 space-y-1 border border-black/10 p-2 text-xs">
                      <div className="font-bold">Create hook</div>
                      <input
                        className="w-full border border-black/20 px-1 py-0.5"
                        placeholder="id (a-z…)"
                        value={hookId}
                        onChange={(e) => setHookId(e.target.value)}
                      />
                      <select
                        className="w-full border border-black/20 px-1 py-0.5"
                        value={hookKind}
                        onChange={(e) =>
                          setHookKind(e.target.value as 'astro' | 'astro+jsx')
                        }
                      >
                        <option value="astro">astro</option>
                        <option value="astro+jsx">astro+jsx</option>
                      </select>
                      <button
                        type="button"
                        className="bg-black px-2 py-0.5 text-white"
                        onClick={() => {
                          if (!hookId.trim()) return;
                          onAddHook(hookId.trim(), hookKind);
                          setHookId('');
                        }}
                      >
                        Create hook
                      </button>
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
                      <div
                        key={h.id}
                        className="flex flex-wrap items-center gap-2 py-0.5 pl-2 text-sm"
                      >
                        <span
                          className="min-w-0 flex-1 truncate font-medium"
                          title={h.kind}
                        >
                          hook:{h.id}
                        </span>
                        <PairOpenButton
                          label="blade"
                          path={h.blade}
                          icon={<CodeBracketIcon className="h-3.5 w-3.5" />}
                          onOpen={openSourcePath}
                        />
                        {(h.files?.length ? h.files : [null]).map((fp, i) => (
                          <PairOpenButton
                            key={fp || `pane-missing-${i}`}
                            label={
                              h.files?.length && h.files.length > 1
                                ? `pane ${i + 1}`
                                : 'pane'
                            }
                            path={fp}
                            icon={
                              <RectangleGroupIcon className="h-3.5 w-3.5" />
                            }
                            onOpen={openSourcePath}
                          />
                        ))}
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center gap-0.5 text-xs text-red-800 hover:underline"
                          onClick={() => onRemoveHook(h.id)}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-2">
                <button
                  type="button"
                  className="mb-1 flex w-full items-center gap-1 font-action text-base"
                  onClick={() => setRoutesOpen((o) => !o)}
                >
                  {routesOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}{' '}
                  Routes
                </button>
                {routesOpen && (
                  <div className="pl-2">
                    <div className="mb-2 space-y-1 border border-black/10 p-2 text-xs">
                      <div className="font-bold">Create route</div>
                      <input
                        className="w-full border border-black/20 px-1 py-0.5"
                        placeholder="name (a-z…)"
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                      />
                      <button
                        type="button"
                        className="bg-black px-2 py-0.5 text-white"
                        onClick={() => {
                          if (!routeName.trim()) return;
                          onAddRoute(routeName.trim());
                          setRouteName('');
                        }}
                      >
                        Create route
                      </button>
                    </div>
                    {(registry?.routes || []).map((r) => (
                      <div
                        key={r.name}
                        className="flex flex-wrap items-center gap-2 py-0.5 pl-2 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          route:{r.name}
                        </span>
                        <PairOpenButton
                          label="blade"
                          path={r.shell}
                          icon={<CodeBracketIcon className="h-3.5 w-3.5" />}
                          onOpen={openSourcePath}
                        />
                        <PairOpenButton
                          label="page"
                          path={r.view}
                          icon={<DocumentTextIcon className="h-3.5 w-3.5" />}
                          onOpen={openSourcePath}
                        />
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center gap-0.5 text-xs text-red-800 hover:underline"
                          onClick={() => onRemoveRoute(r.name)}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-2">
                <button
                  type="button"
                  className="mb-1 flex w-full items-center gap-1 font-action text-base"
                  onClick={() => setFilesOpen((o) => !o)}
                >
                  {filesOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}{' '}
                  Files
                </button>
                {filesOpen && (
                  <div className="pl-2">
                    <p className="mb-1 text-xs text-black/60">
                      Target:{' '}
                      <span className="font-mono font-bold">
                        {selectedSourceDir || 'src/custom'}
                      </span>
                    </p>
                    <div className="mb-2 flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 bg-black/10 px-2 py-0.5 text-xs"
                        onClick={() => onCreateSourceFile()}
                      >
                        <DocumentPlusIcon className="h-3.5 w-3.5" />
                        New file
                      </button>
                    </div>
                    <Folder
                      label="src"
                      nodes={sourceNodes}
                      rootPrefix="src"
                      selectableDirs
                      selectedDir={selectedSourceDir}
                      onSelectDir={onSelectSourceDir}
                      onOpenFile={(n) =>
                        onSelect({
                          kind: 'source',
                          path: n.path,
                          tooLarge: n.tooLarge,
                        })
                      }
                    />
                  </div>
                )}
              </div>
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
          {assetsOpen ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}{' '}
          Assets
          <span className="ml-1 text-xs font-normal text-green-800">live</span>
        </button>
        {assetsOpen && (
          <div className="pl-2">
            <p className="mb-1 text-xs text-black/60">
              Target: <span className="font-mono font-bold">{targetLabel}</span>
              {selectedZip ? (
                <>
                  {' '}
                  · zip:{' '}
                  <span className="font-mono">{selectedZip}</span>
                </>
              ) : null}
            </p>
            <div className="mb-2 flex flex-wrap gap-1">
              <label className="inline-flex cursor-pointer items-center gap-1 bg-black/10 px-2 py-0.5 text-xs">
                <ArrowUpTrayIcon className="h-3.5 w-3.5" />
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
              <label className="inline-flex cursor-pointer items-center gap-1 bg-black/10 px-2 py-0.5 text-xs">
                <FolderIcon className="h-3.5 w-3.5" />
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
              <button
                type="button"
                disabled={!selectedZip}
                className="inline-flex items-center gap-1 bg-black/10 px-2 py-0.5 text-xs disabled:opacity-40"
                onClick={() => onExpandZip()}
              >
                <ArchiveBoxIcon className="h-3.5 w-3.5" />
                Expand zip
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 bg-black/10 px-2 py-0.5 text-xs"
                onClick={() => onMkdir()}
              >
                <FolderPlusIcon className="h-3.5 w-3.5" />
                New folder
              </button>
              <button
                type="button"
                disabled={!canDeleteAsset}
                title={
                  !canDeleteAsset && selectedDir && !selectedFile
                    ? 'Folder is not empty'
                    : undefined
                }
                className="inline-flex items-center gap-1 bg-red-800/10 px-2 py-0.5 text-xs text-red-900 disabled:opacity-40"
                onClick={() => onDeleteAsset()}
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
            <Folder
              label="/custom"
              nodes={assetNodes}
              rootPrefix=""
              selectableDirs
              selectedDir={selectedDir}
              selectedFile={selectedFile}
              onSelectDir={onSelectAssetDir}
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
            {buildOpen ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}{' '}
            Build
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

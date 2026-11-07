import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import type { FormStateReturn } from '@/hooks/useFormState';
import CodeEditor, { type EditorTab } from './CodeEditor';
import AssetPreview from './AssetPreview';

type EditorForm = { content: string };

export type FileHistorySlot = {
  jobId: string;
  builtAt: string;
  capturedAt: string;
  existed: boolean;
  size: number;
  sha256?: string;
};

export default function ExtendEditorModal({
  open,
  onClose,
  tabs,
  activeKey,
  preview,
  editorFormState,
  onSelectTab,
  onChangeTab,
  onCloseTab,
  onPreviewDeleted,
  onPreviewReplaced,
  fileHistorySlots,
  fileHistoryLoading,
  onToggleHistory,
  historyOpen,
  onRestoreFileSlot,
}: {
  open: boolean;
  onClose: () => void;
  tabs: EditorTab[];
  activeKey: string | null;
  preview: { path: string; size?: number; mtime?: string } | null;
  editorFormState: FormStateReturn<EditorForm> | null;
  onSelectTab: (key: string) => void;
  onChangeTab: (key: string, content: string) => void;
  onCloseTab: (key: string) => void;
  onPreviewDeleted: () => void;
  onPreviewReplaced: () => void;
  fileHistorySlots: FileHistorySlot[];
  fileHistoryLoading: boolean;
  onToggleHistory: () => void;
  historyOpen: boolean;
  onRestoreFileSlot: (jobId: string) => void;
}) {
  const showPreview = !!preview && tabs.length === 0;
  const effectiveKey = activeKey || tabs[0]?.key || null;
  const activeTab = tabs.find((t) => t.key === effectiveKey) || null;
  // Match UnsavedChangesBar occupancy: pad only while dirty or mid-save — not after
  // success/idle when the bar has already dismissed.
  const barVisible =
    !!editorFormState &&
    (editorFormState.isDirty || editorFormState.saveState === 'saving');
  if (!open || (tabs.length === 0 && !preview)) {
    return null;
  }

  return (
    <Dialog.Root
      open={true}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      modal={true}
      preventScroll={true}
      closeOnEscape={true}
      closeOnInteractOutside={true}
    >
      <Portal>
        <Dialog.Backdrop
          className="fixed inset-0 bg-black/80"
          style={{ zIndex: 9005 }}
        />
        <Dialog.Positioner
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 9006 }}
        >
          <Dialog.Content className="flex h-full w-full flex-col overflow-hidden bg-white">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
              <Dialog.Title className="truncate text-lg font-bold text-gray-900">
                {showPreview
                  ? `/custom/${preview!.path}`
                  : activeTab?.path || tabs[0]?.path || 'Editor'}
              </Dialog.Title>
              <div className="flex shrink-0 items-center gap-2">
                {!showPreview && activeTab ? (
                  <button
                    type="button"
                    className="rounded bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-900 hover:bg-gray-200"
                    onClick={onToggleHistory}
                  >
                    {historyOpen ? 'Hide history' : 'History'}
                  </button>
                ) : null}
                <Dialog.CloseTrigger
                  type="button"
                  className="rounded bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-900 hover:bg-gray-200"
                >
                  Close
                </Dialog.CloseTrigger>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-3">
              {historyOpen && !showPreview && activeTab ? (
                <div className="mb-3 max-h-40 shrink-0 overflow-auto border border-black/10 bg-black/[0.02] p-2 text-xs">
                  <p className="mb-1 font-bold">File history</p>
                  {fileHistoryLoading ? (
                    <p className="text-black/50">Loading…</p>
                  ) : fileHistorySlots.length === 0 ? (
                    <p className="text-black/50">No slots for this file yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {fileHistorySlots.map((s) => (
                        <li
                          key={s.jobId}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 py-1 last:border-0"
                        >
                          <span className="font-mono text-[11px]">
                            {s.jobId}
                            <span className="ml-2 text-black/50">
                              {s.existed
                                ? `${s.size} B · ${s.capturedAt}`
                                : `tombstone · ${s.capturedAt}`}
                            </span>
                          </span>
                          <button
                            type="button"
                            className="border border-black/20 bg-white px-2 py-0.5 text-[11px] font-bold"
                            onClick={() => onRestoreFileSlot(s.jobId)}
                          >
                            Restore
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-auto">
                {showPreview ? (
                  <AssetPreview
                    path={preview!.path}
                    size={preview!.size}
                    mtime={preview!.mtime}
                    onDeleted={onPreviewDeleted}
                    onReplaced={onPreviewReplaced}
                  />
                ) : (
                  <CodeEditor
                    tabs={tabs}
                    activeKey={effectiveKey}
                    onSelect={onSelectTab}
                    onChange={onChangeTab}
                    onClose={onCloseTab}
                  />
                )}
              </div>
              {/* Reserve space so fixed UnsavedChangesBar does not cover editor bottom */}
              {barVisible && !showPreview && (
                <div className="h-28 shrink-0" aria-hidden="true" />
              )}
            </div>
            {!showPreview && editorFormState && (
              <UnsavedChangesBar
                formState={editorFormState}
                message="You have unsaved file changes"
                saveLabel="Save"
                cancelLabel="Discard"
                className="!z-[9010]"
              />
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

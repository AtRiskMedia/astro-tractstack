import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import UnsavedChangesBar from '@/components/form/UnsavedChangesBar';
import type { FormStateReturn } from '@/hooks/useFormState';
import CodeEditor, { type EditorTab } from './CodeEditor';
import AssetPreview from './AssetPreview';

type EditorForm = { content: string };

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
}) {
  const showPreview = !!preview && tabs.length === 0;
  const effectiveKey = activeKey || tabs[0]?.key || null;
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
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
              <Dialog.Title className="truncate text-lg font-bold text-gray-900">
                {showPreview
                  ? `/custom/${preview!.path}`
                  : tabs.find((t) => t.key === effectiveKey)?.path ||
                    tabs[0]?.path ||
                    'Editor'}
              </Dialog.Title>
              <Dialog.CloseTrigger
                type="button"
                className="rounded bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-900 hover:bg-gray-200"
              >
                Close
              </Dialog.CloseTrigger>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-3">
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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { Dialog } from '@ark-ui/react';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import { getCtx } from '@/stores/nodes';
import { selectionStore } from '@/stores/selection';
import { sandboxTokenStore } from '@/stores/storykeep';
import { AiDesignStep, type AiDesignConfig } from './steps/AiDesignStep';
import { AiCreativeDesignStep } from './steps/AiCreativeDesignStep';
import prompts from '@/constants/prompts.json';
import { TractStackAPI } from '@/utils/api';
import { parseAiPane } from '@/utils/compositor/aiPaneParser';
import { extractTextFromAst } from '@/utils/compositor/htmlAst';
import type { PaneNode, TemplatePane } from '@/types/compositorTypes';

const callAskLemurAPI = async (
  prompt: string,
  context: string,
  expectJson: boolean,
  isSandboxMode: boolean
): Promise<string> => {
  const tenantId =
    (window as any).TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';
  const api = new TractStackAPI(tenantId);

  const requestBody = {
    prompt,
    input_text: context,
    final_model: '',
    temperature: 0.5,
    max_tokens: 2000,
  };

  let resultData: any;

  if (isSandboxMode) {
    const token = sandboxTokenStore.get();
    const response = await fetch(`/api/sandbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Sandbox-Token': token || '',
      },
      credentials: 'include',
      body: JSON.stringify({ action: 'askLemur', payload: requestBody }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sandbox API failed: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || 'Sandbox generation failed');
    }
    resultData = json.data;
  } else {
    const response = await api.post('/api/v1/aai/askLemur', requestBody);
    if (!response.success || !response.data?.response) {
      throw new Error(response.error || 'AI generation failed');
    }
    resultData = response.data;
  }

  let raw = resultData.response;
  if (typeof raw === 'string') {
    if (raw.startsWith('```json')) raw = raw.slice(7, -3).trim();
  }
  if (expectJson && typeof raw === 'object') return JSON.stringify(raw);
  return raw;
};

interface AiRestylePaneModalProps {
  isSandboxMode?: boolean;
}

export const AiRestylePaneModal = ({
  isSandboxMode = false,
}: AiRestylePaneModalProps) => {
  const ctx = getCtx();
  const { isAiRestyleModalOpen, paneToRestyleId } = useStore(selectionStore);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDesignConfig, setAiDesignConfig] = useState<AiDesignConfig>({
    harmony: 'Analogous',
    baseColor: '',
    accentColor: '',
    theme: 'Light',
    additionalNotes: '',
  });

  const node = paneToRestyleId
    ? (ctx.allNodes.get().get(paneToRestyleId) as PaneNode)
    : null;
  const isCreative = !!node?.htmlAst;

  const initialCreativeTopic = useMemo(() => {
    if (isCreative && node?.htmlAst?.tree) {
      return extractTextFromAst(node.htmlAst.tree);
    }
    return '';
  }, [isCreative, node]);

  const handleClose = () => {
    if (loading) return;
    selectionStore.setKey('isAiRestyleModalOpen', false);
    selectionStore.setKey('paneToRestyleId', null);
    setError(null);
  };

  const handleCreativeUpdate = (template: TemplatePane) => {
    if (!paneToRestyleId) return;
    ctx.applyShellToPane(paneToRestyleId, template);
  };

  const handleGenerate = async () => {
    if (!paneToRestyleId) return;
    setLoading(true);
    setError(null);

    try {
      const childIds = ctx.getChildNodeIDs(paneToRestyleId);
      const nodesMap = ctx.allNodes.get();
      const gridNode = childIds.find(
        (id) => nodesMap.get(id)?.nodeType === 'GridLayoutNode'
      );
      const isGrid = !!gridNode;

      const promptConfig = isGrid
        ? prompts.aiPromptsIndex.find((p) => p.layout === 'grid')
        : prompts.aiPromptsIndex.find((p) => p.layout === 'standard');

      if (!promptConfig) throw new Error('No suitable prompt found');

      let designInput = `Generate a design using a **${aiDesignConfig.harmony.toLowerCase()}** color scheme with a **${aiDesignConfig.theme.toLowerCase()}** theme.`;
      if (aiDesignConfig.baseColor)
        designInput += ` Base around **${aiDesignConfig.baseColor}**.`;
      if (aiDesignConfig.accentColor)
        designInput += ` Accent with **${aiDesignConfig.accentColor}**.`;
      if (aiDesignConfig.additionalNotes)
        designInput += ` Notes: "${aiDesignConfig.additionalNotes}"`;

      const shellPromptKey = promptConfig.prompts.shell as keyof typeof prompts;
      const shellPromptDetails = prompts[shellPromptKey] as any;

      const formattedPrompt = shellPromptDetails.user_template
        .replace('{{DESIGN_INPUT}}', designInput)
        .replace('{{COPY_INPUT}}', 'A generic content section')
        .replace('{{LAYOUT_TYPE}}', 'Text Only');

      const resultStr = await callAskLemurAPI(
        formattedPrompt,
        shellPromptDetails.system || '',
        true,
        isSandboxMode
      );

      let dummyCopy: string | string[] = '';
      if (isGrid) {
        dummyCopy = ['', ''];
      }

      const hydratedTemplate = parseAiPane(resultStr, dummyCopy, 'Text Only');

      ctx.applyShellToPane(paneToRestyleId, hydratedTemplate);
      handleClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to restyle pane');
    } finally {
      setLoading(false);
    }
  };

  if (!isAiRestyleModalOpen) return null;

  return (
    <Dialog.Root
      open={isAiRestyleModalOpen}
      onOpenChange={(e) => !e.open && handleClose()}
    >
      <Dialog.Backdrop className="fixed inset-0 z-103 bg-black bg-opacity-75" />
      <Dialog.Positioner className="fixed inset-0 z-104 flex items-center justify-center p-4">
        <Dialog.Content className="flex max-w-2xl flex-col rounded-lg bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <SparklesIcon className="h-5 w-5 text-purple-600" />
              {isCreative ? 'Re-Design Creative Pane' : 'Re-Color Pane'}
            </h3>
            <button
              onClick={handleClose}
              disabled={loading}
              className="rounded-full p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {isCreative ? (
            <div className="max-h-[80vh] overflow-y-auto">
              <AiCreativeDesignStep
                onBack={handleClose}
                onSuccess={handleClose}
                onDirectInject={() => {}}
                onCreatePane={handleCreativeUpdate}
                isSandboxMode={isSandboxMode}
                initialTopic={initialCreativeTopic}
                reStyle={true}
              />
            </div>
          ) : (
            <form className="p-6" onSubmit={(e) => e.preventDefault()}>
              <div className={loading ? 'pointer-events-none opacity-50' : ''}>
                <AiDesignStep
                  designConfig={aiDesignConfig}
                  onDesignConfigChange={setAiDesignConfig}
                />
              </div>

              {error && (
                <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-lg px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2 font-bold text-white shadow transition-all hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5" />
                      Apply Re-Color
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

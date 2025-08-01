import { useState } from 'react';
import { AddPanePanel_newAICopy_modal } from './AddPanePanel_newAICopy_modal';
import { panePrompts, contextPanePrompts } from '@/constants/prompts.json';

interface AddPaneNewAICopyProps {
  onChange: (value: string) => void;
  isContextPane: boolean;
}

export const AddPanePanel_newAICopy = ({
  onChange,
  isContextPane,
}: AddPaneNewAICopyProps) => {
  const [customizedPrompt, setCustomizedPrompt] = useState(
    isContextPane
      ? contextPanePrompts.shortformcontext
      : panePrompts.shortformcontext
  );
  const [referenceContext, setReferenceContext] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleContentGenerated = (content: string) => {
    onChange(content);
    setShowModal(false);
  };

  return (
    <div className="w-full rounded-lg bg-white shadow">
      <div className="space-y-6 p-6">
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            Customize Writing Style (Optional)
          </label>
          <textarea
            rows={6}
            className="w-full rounded-md border-gray-300 p-3.5 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            value={customizedPrompt}
            onChange={(e) => setCustomizedPrompt(e.target.value)}
            maxLength={1000}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900">
            Reference Content &ndash; copy and paste dump here; no formatting
            required...
          </label>
          <textarea
            rows={8}
            className="w-full rounded-md border-gray-300 p-3.5 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            value={referenceContext}
            onChange={(e) => setReferenceContext(e.target.value)}
            maxLength={200000}
            placeholder="Paste your reference content here..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-gray-900">
            Additional Instructions (Optional)
          </label>
          <textarea
            rows={4}
            className="w-full rounded-md border-gray-300 p-3.5 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            maxLength={2000}
            placeholder="Any additional instructions or requirements..."
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!referenceContext.trim()}
            className={`rounded-md px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
              referenceContext.trim()
                ? 'bg-cyan-600 hover:bg-cyan-700'
                : 'cursor-not-allowed bg-gray-300'
            }`}
          >
            Generate Content
          </button>
        </div>
      </div>

      <AddPanePanel_newAICopy_modal
        show={showModal}
        onClose={handleModalClose}
        prompt={customizedPrompt}
        referenceContext={referenceContext}
        additionalInstructions={additionalInstructions}
        onChange={handleContentGenerated}
        isContextPane={isContextPane}
      />
    </div>
  );
};

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { renderedPreviews, updatePreview } from '@/stores/previews';
import { viewportKeyStore } from '@/stores/storykeep';
import type { CreativePanePayload } from '@/types/compositorTypes';

export interface CreativePaneProps {
  nodeId: string;
  htmlAst: CreativePanePayload;
}

const viewportMap = {
  mobile: 'xs',
  tablet: 'md',
  desktop: 'xl',
} as const;

export const CreativePane = ({ nodeId, htmlAst }: CreativePaneProps) => {
  const previews = useStore(renderedPreviews);
  const { value: viewportKey } = useStore(viewportKeyStore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeViewport = viewportMap[viewportKey];
  const htmlContent = previews[nodeId];

  useEffect(() => {
    const fetchPreview = async () => {
      if (!htmlAst?.tree || previews[nodeId]) return;

      setLoading(true);
      setError(null);

      try {
        const tenantId =
          (window as any).TRACTSTACK_CONFIG?.tenantId ||
          import.meta.env.PUBLIC_TENANTID ||
          'default';

        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

        const response = await fetch(
          `${goBackend}/api/v1/fragments/ast-preview`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-ID': tenantId,
            },
            body: JSON.stringify({
              id: nodeId,
              title: 'Editor Preview',
              tree: htmlAst.tree,
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            text || `Preview generation failed: ${response.status}`
          );
        }

        const html = await response.text();
        updatePreview(nodeId, html);
      } catch (err) {
        console.error(`CreativePane fetch failed for ${nodeId}:`, err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [htmlAst?.tree, nodeId]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-500">
        Preview Error: {error}
      </div>
    );
  }

  if (!htmlContent && loading) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gray-50"
        style={{ minHeight: '100px' }}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!htmlContent) return null;
  const activeCss = htmlAst.viewportCss?.[activeViewport] || htmlAst.css;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: activeCss }} />
      <div
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className="creative-pane-wrapper h-full w-full"
      />
    </>
  );
};

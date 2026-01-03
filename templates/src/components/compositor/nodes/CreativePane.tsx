import {
  useEffect,
  useState,
  useRef,
  type MouseEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { useStore } from '@nanostores/react';
import { renderedPreviews, updatePreview } from '@/stores/previews';
import { settingsPanelStore, viewportKeyStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import type { CreativePanePayload } from '@/types/compositorTypes';

export interface CreativePaneProps {
  nodeId: string;
  htmlAst: CreativePanePayload;
  isProtected?: boolean;
}

const viewportMap = {
  mobile: 'xs',
  tablet: 'md',
  desktop: 'xl',
} as const;

export const CreativePane = ({
  nodeId,
  htmlAst,
  isProtected = false,
}: CreativePaneProps) => {
  const previews = useStore(renderedPreviews);
  const { value: viewportKey } = useStore(viewportKeyStore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeViewport = viewportMap[viewportKey];
  const htmlContent = previews[nodeId];

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const fetchPreview = async () => {
      if (!htmlAst?.tree) return;
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
            signal,
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            text || `Preview generation failed: ${response.status}`
          );
        }

        const html = await response.text();

        if (!signal.aborted) {
          updatePreview(nodeId, html);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        console.error(`CreativePane fetch failed for ${nodeId}:`, err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      controller.abort();
    };
  }, [htmlAst?.css, htmlAst?.tree, nodeId]);

  useEffect(() => {
    const ctx = getCtx();
    const unsubscribe = ctx.toolModeValStore.subscribe((state) => {
      const container = contentRef.current;
      if (!container) return;

      const editables = container.querySelectorAll('[data-ast-id]');

      if (state.value === 'styles') {
        editables.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.isContentEditable) return;
          htmlEl.style.outline = '2px dotted #06b6d4';
          htmlEl.style.outlineOffset = '2px';
          htmlEl.style.cursor = 'pointer';

          const astId = htmlEl.getAttribute('data-ast-id');
          if (!astId) return;

          const existingIcon = container.querySelector(
            `[data-proxy-for="${astId}"]`
          );
          if (existingIcon) return;

          const icon = document.createElement('div');
          icon.setAttribute('data-proxy-for', astId);
          icon.style.position = 'absolute';
          icon.style.zIndex = '1003';
          icon.style.width = '24px';
          icon.style.height = '24px';
          icon.style.backgroundColor = '#06b6d4';
          icon.style.borderRadius = '9999px';
          icon.style.display = 'flex';
          icon.style.alignItems = 'center';
          icon.style.justifyContent = 'center';
          icon.style.color = 'white';
          icon.style.fontSize = '12px';
          icon.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';
          icon.style.cursor = 'pointer';
          icon.innerHTML = '✎';

          const rect = htmlEl.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          icon.style.top = `${rect.top - containerRect.top - 12}px`;
          icon.style.left = `${rect.left - containerRect.left - 12}px`;

          icon.onmouseenter = () => {
            htmlEl.style.outline = '3px solid #06b6d4';
          };
          icon.onmouseleave = () => {
            htmlEl.style.outline = '2px dotted #06b6d4';
          };

          container.appendChild(icon);
        });
      } else {
        editables.forEach((el) => {
          (el as HTMLElement).style.outline = '';
          (el as HTMLElement).style.outlineOffset = '';
          (el as HTMLElement).style.cursor = '';
        });
        const icons = container.querySelectorAll('[data-proxy-for]');
        icons.forEach((icon) => icon.remove());
      }
    });

    return () => unsubscribe();
  }, [htmlContent]);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Look for data-ast-id on the clicked element OR data-proxy-for on the icon
    const astId =
      target.closest('[data-ast-id]')?.getAttribute('data-ast-id') ||
      target.getAttribute('data-proxy-for');

    const ctx = getCtx();
    const mode = ctx.toolModeValStore.get().value;

    if (!astId) return;

    if (mode === 'styles') {
      e.preventDefault();
      const meta = htmlAst.editableElements?.[astId];
      if (meta) {
        let action = '';
        if (meta.isCssBackground) {
          action = 'style-creative-bg';
        } else if (meta.tagName === 'img') {
          action = 'style-creative-img';
        } else if (meta.tagName === 'a') {
          action = 'style-creative-link';
        } else if (meta.tagName === 'button') {
          action = 'style-creative-btn';
        }

        if (action) {
          settingsPanelStore.set({
            action,
            nodeId,
            childId: astId,
            expanded: true,
          });
        }
      }
    }

    if (target.tagName === 'A') {
      e.preventDefault();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const ctx = getCtx();
    const mode = ctx.toolModeValStore.get().value;
    if (mode !== 'text' || isProtected) return;

    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.isContentEditable) {
        e.preventDefault();
        target.blur();
      }
    }
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    const ctx = getCtx();
    const mode = ctx.toolModeValStore.get().value;
    if (mode !== 'text' || isProtected) return;

    const target = e.target as HTMLElement;
    const astId = target.getAttribute('data-ast-id');

    if (astId && target.isContentEditable) {
      const content = target.innerHTML;
      ctx.updateCreativePane(nodeId, astId, content);
    }
  };

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
        ref={contentRef}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="creative-pane-wrapper relative h-full w-full"
      >
        {isProtected && (
          <div className="absolute inset-0 z-50 cursor-crosshair bg-transparent" />
        )}
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
    </>
  );
};

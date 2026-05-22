import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
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

function removeEditProxies(container: HTMLElement) {
  container.querySelectorAll('[data-proxy-positioned]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    const prev = htmlEl.getAttribute('data-proxy-prev-position');
    htmlEl.style.position = prev ?? '';
    htmlEl.removeAttribute('data-proxy-positioned');
    htmlEl.removeAttribute('data-proxy-prev-position');
  });

  container
    .querySelectorAll('[data-proxy-for]')
    .forEach((icon) => icon.remove());

  container.querySelectorAll('[data-ast-id]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.outline = '';
    htmlEl.style.outlineOffset = '';
    htmlEl.style.cursor = '';
  });
}

function ensurePositionedAnchor(anchorEl: HTMLElement) {
  if (getComputedStyle(anchorEl).position !== 'static') return;

  anchorEl.setAttribute('data-proxy-positioned', 'true');
  anchorEl.setAttribute('data-proxy-prev-position', anchorEl.style.position);
  anchorEl.style.position = 'relative';
}

function createProxyIcon(
  htmlEl: HTMLElement,
  astId: string,
  htmlAst: CreativePanePayload,
  paneNodeId: string
) {
  const icon = document.createElement('div');
  icon.setAttribute('data-proxy-for', astId);
  icon.className = 'compositor-chrome';
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
  icon.style.pointerEvents = 'auto';
  icon.innerHTML = '✎';

  icon.onmouseenter = () => {
    htmlEl.style.outline = '3px solid #06b6d4';
  };
  icon.onmouseleave = () => {
    htmlEl.style.outline = '2px dotted #06b6d4';
  };
  icon.onclick = (e) => {
    e.stopPropagation();
    const meta = htmlAst.editableElements?.[astId];
    if (!meta) return;

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
        nodeId: paneNodeId,
        childId: astId,
        expanded: true,
      });
    }
  };

  return icon;
}

function syncEditProxies(
  container: HTMLElement,
  htmlAst: CreativePanePayload,
  paneNodeId: string
) {
  removeEditProxies(container);

  container.querySelectorAll('[data-ast-id]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.isContentEditable) return;

    const astId = htmlEl.getAttribute('data-ast-id');
    if (!astId) return;

    htmlEl.style.outline = '2px dotted #06b6d4';
    htmlEl.style.outlineOffset = '2px';

    const icon = createProxyIcon(htmlEl, astId, htmlAst, paneNodeId);

    if (htmlEl.tagName === 'IMG') {
      const parent = htmlEl.parentElement;
      if (parent instanceof HTMLElement) {
        ensurePositionedAnchor(parent);
        icon.style.top = `${htmlEl.offsetTop - 12}px`;
        icon.style.left = `${htmlEl.offsetLeft - 12}px`;
        parent.appendChild(icon);
        return;
      }
    }

    ensurePositionedAnchor(htmlEl);
    icon.style.top = '-12px';
    icon.style.left = '-12px';
    htmlEl.appendChild(icon);
  });
}

export const CreativePane = ({
  nodeId,
  htmlAst,
  isProtected = false,
}: CreativePaneProps) => {
  const ctx = getCtx();
  const previews = useStore(renderedPreviews);
  const { value: viewportKey } = useStore(viewportKeyStore);
  const { value: toolModeVal } = useStore(ctx.toolModeValStore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const htmlAstRef = useRef(htmlAst);
  htmlAstRef.current = htmlAst;

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

  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el || htmlContent == null) return;
    if (el.innerHTML !== htmlContent) {
      el.innerHTML = htmlContent;
    }
  }, [htmlContent]);

  useLayoutEffect(() => {
    const container = contentRef.current;
    if (!container || !htmlContent) return;

    if (toolModeVal === 'text') {
      syncEditProxies(container, htmlAstRef.current, nodeId);
    } else {
      removeEditProxies(container);
    }
  });

  useEffect(() => {
    const container = contentRef.current;
    if (!container || !htmlContent) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const resizeObserver = new ResizeObserver(() => {
      if (ctx.toolModeValStore.get().value !== 'text') return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (ctx.toolModeValStore.get().value === 'text') {
          syncEditProxies(container, htmlAstRef.current, nodeId);
        }
      }, 100);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [htmlContent, nodeId, toolModeVal, ctx]);

  useEffect(() => {
    return () => {
      const container = contentRef.current;
      if (container) removeEditProxies(container);
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="creative-pane-wrapper relative h-full w-full"
      >
        {isProtected && (
          <div className="absolute inset-0 z-50 cursor-crosshair bg-transparent" />
        )}
        <div ref={previewRef} />
      </div>
    </>
  );
};

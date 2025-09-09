import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getCtx, type NodesContext } from '@/stores/nodes';

interface PanelVisibilityWrapperProps {
  nodeId: string;
  panelType: string;
  children: ReactNode;
  ctx?: NodesContext;
}

/**
 * Wrapper component that handles automatically closing panels when they scroll out of view
 */
const PanelVisibilityWrapper = ({
  nodeId,
  panelType,
  children,
  ctx,
}: PanelVisibilityWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const nodesCtx = ctx || getCtx();

  // Track active panel state for this specific component
  const [isActive, setIsActive] = useState(false);

  // Setup effect to track active panel state
  useEffect(() => {
    // Create a function to check if this panel is active
    const checkIfActive = () => {
      const activePaneMode = nodesCtx.activePaneMode.get();
      return (
        activePaneMode.panel === panelType && activePaneMode.paneId === nodeId
      );
    };

    // Set initial state
    setIsActive(checkIfActive());

    // Subscribe to changes in the active panel mode
    const unsubscribe = nodesCtx.activePaneMode.subscribe(() => {
      setIsActive(checkIfActive());
    });

    return () => {
      unsubscribe();
    };
  }, [nodeId, panelType, nodesCtx]);

  // Setup intersection observer
  useEffect(() => {
    const currentWrapper = wrapperRef.current;
    if (!currentWrapper) return;

    // Skip intersection observer for 'add' panels - they behave differently
    if (panelType === 'add') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Add delay to prevent immediate closing during panel activation
        if (isActive) {
          setTimeout(() => {
            // Double-check the panel is still active before closing
            const currentActiveMode = nodesCtx.activePaneMode.get();
            const stillActive =
              currentActiveMode.panel === panelType &&
              currentActiveMode.paneId === nodeId;
            if (!entries[0].isIntersecting && stillActive) {
              console.log('❌ CLOSING PANEL DUE TO INTERSECTION OBSERVER!', {
                panelType,
                nodeId,
              });
              nodesCtx.closeAllPanels();
            }
          }, 100); // Small delay to allow panel to render
        }
      },
      {
        threshold: 0.1,
        rootMargin: '-10px',
      }
    );

    observer.observe(currentWrapper);
    return () => observer.disconnect();
  }, [nodeId, panelType, nodesCtx, isActive]);

  return (
    <div
      ref={wrapperRef}
      data-panel-type={panelType}
      data-node-id={nodeId}
      data-active={isActive}
    >
      {children}
    </div>
  );
};

export default PanelVisibilityWrapper;

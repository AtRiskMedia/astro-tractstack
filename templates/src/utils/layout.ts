import {
  settingsPanelOpenStore,
  settingsPanelStore,
  headerPositionStore,
  setHeaderPosition,
  setMobileHeaderFaded,
} from '@/stores/storykeep';
import { debounce } from '@/utils/helpers';

let hasScrolledForSettingsPanel = false;
let currentPaneObserver: IntersectionObserver | null = null;
let settingsPanelSubscription: (() => void) | null = null;
let debouncedUpdateListener: (() => void) | null = null;

function cleanupLayoutObservers() {
  if (currentPaneObserver) {
    currentPaneObserver.disconnect();
    currentPaneObserver = null;
  }
  if (settingsPanelSubscription) {
    settingsPanelSubscription();
    settingsPanelSubscription = null;
  }
  if (debouncedUpdateListener && typeof window !== `undefined`) {
    window.removeEventListener('scroll', debouncedUpdateListener);
    window.removeEventListener('resize', debouncedUpdateListener);
    debouncedUpdateListener = null;
  }
  if (typeof document !== `undefined`) {
    const storykeepHeader = document.getElementById('storykeepHeader');
    if (storykeepHeader) {
      document.body.style.paddingTop = '';
      storykeepHeader.style.position = '';
      storykeepHeader.style.top = '';
    }
  }
}

function setupPaneObserver() {
  if (currentPaneObserver) {
    currentPaneObserver.disconnect();
  }

  settingsPanelSubscription = settingsPanelStore.subscribe((signalValue) => {
    if (currentPaneObserver) {
      currentPaneObserver.disconnect();
      currentPaneObserver = null;
    }

    if (signalValue && signalValue.nodeId && typeof document !== `undefined`) {
      setTimeout(() => {
        const { nodeId } = signalValue;

        const targetElement =
          document.getElementById(`pane-${nodeId}`) ||
          document.querySelector(`[data-node-id="${nodeId}"]`);

        if (targetElement) {
          currentPaneObserver = new IntersectionObserver(
            ([entry]) => {
              const signal = settingsPanelStore.get();
              const now = Date.now();
              if (signal?.editLock && now - signal.editLock < 100) {
                return;
              }
              if (!entry.isIntersecting) {
                settingsPanelStore.set(null);
              }
            },
            { threshold: 0 }
          );
          currentPaneObserver.observe(targetElement);
        }
      }, 100);
    }
  });
}

export function setupLayoutObservers(): void {
  cleanupLayoutObservers();

  if (typeof document !== `undefined` || typeof window !== `undefined`) {
    const storykeepHeader = document.getElementById('storykeepHeader');
    const settingsControls = document.getElementById('settingsControls');
    const standardHeader = document.querySelector('header');

    if (!storykeepHeader || !settingsControls || !standardHeader) return;

    let standardHeaderHeight = 0;
    const updateStandardHeaderHeight = () => {
      standardHeaderHeight = standardHeader.offsetHeight;
    };

    const updatePanelPosition = () => {
      const headerRect = storykeepHeader.getBoundingClientRect();
      const panelTop = headerRect.bottom;
      settingsControls.style.top = `${panelTop}px`;
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const shouldBeSticky = scrollY > standardHeaderHeight;
      const currentPosition = headerPositionStore.get();
      const newPosition = shouldBeSticky ? 'sticky' : 'normal';

      if (currentPosition !== newPosition) {
        setHeaderPosition(newPosition);
        if (shouldBeSticky) {
          document.body.style.paddingTop = `${storykeepHeader.offsetHeight}px`;
          storykeepHeader.style.position = 'fixed';
          storykeepHeader.style.top = '0';
        } else {
          document.body.style.paddingTop = '';
          storykeepHeader.style.position = '';
          storykeepHeader.style.top = '';
        }
      }
    };

    debouncedUpdateListener = debounce(() => {
      updateStandardHeaderHeight();
      handleScroll();
      updatePanelPosition();
    }, 50);

    const handleSettingsPanelChange = () => {
      if (!settingsPanelOpenStore.get()) {
        hasScrolledForSettingsPanel = false;
      }
    };

    window.addEventListener('scroll', debouncedUpdateListener, {
      passive: true,
    });
    window.addEventListener('resize', debouncedUpdateListener);
    settingsPanelOpenStore.subscribe(handleSettingsPanelChange);

    setupPaneObserver();

    updateStandardHeaderHeight();
    handleScroll();
    updatePanelPosition();
  }
}

export function handleSettingsPanelMobile(isOpen: boolean): void {
  if (typeof window !== `undefined` && typeof document !== `undefined`) {
    const isMobile = window.innerWidth < 801;
    if (!isMobile) return;

    if (isOpen) {
      const header = document.querySelector('header');
      const headerHeight = header?.offsetHeight || 0;
      const currentScrollY = window.scrollY;

      if (currentScrollY <= headerHeight && !hasScrolledForSettingsPanel) {
        window.scrollTo({ top: headerHeight + 10, behavior: 'smooth' });
        hasScrolledForSettingsPanel = true;
      }
      setMobileHeaderFaded(true);
    } else {
      setMobileHeaderFaded(false);
      hasScrolledForSettingsPanel = false;
    }
  }
}

if (typeof document !== `undefined`) {
  document.addEventListener('astro:before-swap', cleanupLayoutObservers);
}

import {
  settingsPanelOpenStore,
  settingsPanelStore,
  headerPositionStore,
  setHeaderPosition,
  setMobileHeaderFaded,
} from '@/stores/storykeep';
import { debounce } from '@/utils/helpers';

let hasScrolledForSettingsPanel = false;

export function setupLayoutStyles(): void {
  const updateBottomOffset = () => {
    const mobileNavHeight = window.innerWidth < 801 ? 80 : 0;
    const padding = 4;
    const offset = `${mobileNavHeight + padding}px`;
    document.documentElement.style.setProperty(
      '--bottom-right-controls-bottom-offset',
      offset
    );
  };
  updateBottomOffset();
  window.addEventListener('resize', updateBottomOffset);
}

// Replace your existing setupPaneObserver with this one.
function setupPaneObserver() {
  let currentObserver: IntersectionObserver | null = null;

  settingsPanelStore.subscribe((signalValue) => {
    if (currentObserver) {
      currentObserver.disconnect();
      currentObserver = null;
    }

    if (signalValue && signalValue.nodeId) {
      setTimeout(() => {
        const { nodeId } = signalValue;

        const targetElement =
          document.getElementById(`pane-${nodeId}`) ||
          document.querySelector(`[data-node-id="${nodeId}"]`);

        if (targetElement) {
          currentObserver = new IntersectionObserver(
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
          currentObserver.observe(targetElement);
        }
      }, 100);
    }
  });
}

export function setupLayoutObservers(): void {
  const storykeepHeader = document.getElementById('storykeepHeader');
  const toolModeNav = document.getElementById('mainNav');
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

    if (toolModeNav && window.innerWidth >= 801) {
      if (shouldBeSticky) {
        toolModeNav.classList.remove('md:static');
        toolModeNav.classList.add('md:fixed');
        toolModeNav.style.top = '60px';
        toolModeNav.style.left = '0';
      } else {
        toolModeNav.classList.remove('md:fixed');
        toolModeNav.classList.add('md:static');
        toolModeNav.style.top = '';
        toolModeNav.style.left = '';
      }
    }
  };

  const debouncedUpdate = debounce(() => {
    updateStandardHeaderHeight();
    handleScroll();
    updatePanelPosition();
  }, 50);

  const handleSettingsPanelChange = () => {
    if (!settingsPanelOpenStore.get()) {
      hasScrolledForSettingsPanel = false;
    }
  };

  window.addEventListener('scroll', debouncedUpdate, { passive: true });
  window.addEventListener('resize', debouncedUpdate);
  settingsPanelOpenStore.subscribe(handleSettingsPanelChange);

  setupPaneObserver();

  updateStandardHeaderHeight();
  handleScroll();
  updatePanelPosition();
}

export function handleSettingsPanelMobile(isOpen: boolean): void {
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

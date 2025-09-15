import {
  settingsPanelOpenStore,
  headerPositionStore,
  setHeaderPosition,
  setMobileHeaderFaded,
} from '@/stores/storykeep';

// --- START: New Debounce Utility ---
// A utility to prevent a function from running too often.
function debounce<F extends (...args: any[]) => any>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: Parameters<F>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
// --- END: New Debounce Utility ---

let hasScrolledForSettingsPanel = false;

export function setupLayoutStyles(): void {
  const updateBottomOffset = () => {
    const mobileNavHeight = window.innerWidth < 801 ? 80 : 0;
    const padding = 16;
    const offset = `${mobileNavHeight + padding}px`;
    document.documentElement.style.setProperty(
      '--bottom-right-controls-bottom-offset',
      offset
    );
  };
  updateBottomOffset();
  window.addEventListener('resize', updateBottomOffset);
}

export function setupLayoutObservers(): void {
  const storykeepHeader = document.getElementById('storykeepHeader');
  const toolModeNav = document.getElementById('mainNav');
  const mainContent = document.getElementById('mainContent');
  const settingsControls = document.getElementById('settingsControls');
  const standardHeader = document.querySelector('header');

  if (!storykeepHeader || !settingsControls || !standardHeader) return;

  let standardHeaderHeight = 0;
  const updateStandardHeaderHeight = () => {
    standardHeaderHeight = standardHeader.offsetHeight;
  };

  // --- START: New Panel Positioning Logic ---
  // This function implements your idea.
  const updatePanelPosition = () => {
    const headerRect = storykeepHeader.getBoundingClientRect();
    const panelTop = headerRect.bottom;
    settingsControls.style.top = `${panelTop}px`;
  };
  // --- END: New Panel Positioning Logic ---

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
    updatePanelPosition(); // Update panel position on scroll/resize
  }, 200);

  const handleSettingsPanelChange = () => {
    if (!settingsPanelOpenStore.get()) {
      hasScrolledForSettingsPanel = false;
    }
  };

  window.addEventListener('scroll', debouncedUpdate, { passive: true });
  window.addEventListener('resize', debouncedUpdate);
  settingsPanelOpenStore.subscribe(handleSettingsPanelChange);

  // Initial setup on load
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

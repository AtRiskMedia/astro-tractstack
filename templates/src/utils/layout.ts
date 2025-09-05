import {
  settingsPanelOpenStore,
  headerPositionStore,
  setHeaderPosition,
  setMobileHeaderFaded,
} from '@/stores/storykeep';

// Track whether initial scroll adjustment has been made for settings panel
let hasScrolledForSettingsPanel = false;

/**
 * Sets up CSS custom properties for dynamic layout positioning
 */
export function setupLayoutStyles(): void {
  // Calculate and set CSS custom properties for positioning
  const updateBottomOffset = () => {
    const mobileNavHeight = window.innerWidth < 801 ? 80 : 0;
    const padding = 16;
    const offset = `${mobileNavHeight + padding}px`;

    document.documentElement.style.setProperty(
      '--bottom-right-controls-bottom-offset',
      offset
    );
  };

  // Set initial values
  updateBottomOffset();

  // Update on resize
  window.addEventListener('resize', updateBottomOffset);
}

/**
 * Sets up scroll observers for header positioning behavior
 */
export function setupLayoutObservers(): void {
  const header = document.getElementById('storykeepHeader');
  const toolModeNav = document.getElementById('mainNav');
  const mainContent = document.getElementById('mainContent');
  const settingsControls = document.getElementById('settingsControls');
  const standardHeader = document.querySelector('header');

  if (!header) return;

  let headerHeight = 0;
  const updateHeaderHeight = () => {
    if (standardHeader) {
      headerHeight = standardHeader.offsetHeight;
    }
  };

  const updateSettingsMargin = () => {
    if (settingsControls && header) {
      const storyKeepHeaderHeight = header.offsetHeight;
      const viewportHeight = window.innerHeight;
      const bottomOffset = window.innerWidth < 801 ? 96 : 16; // Mobile nav + padding

      // Set top margin to avoid StoryKeep header overlap only
      settingsControls.style.marginTop = `${storyKeepHeaderHeight + 20}px`;

      // Set max height for inner scroll
      const maxHeight =
        viewportHeight - storyKeepHeaderHeight - bottomOffset - 20;
      settingsControls.style.maxHeight = `${maxHeight}px`;
    }
  };

  const handleScroll = () => {
    const scrollY = window.scrollY;
    const shouldBeSticky = scrollY > headerHeight;

    // Only update header position if it actually needs to change
    const currentPosition = headerPositionStore.get();
    const newPosition = shouldBeSticky ? 'sticky' : 'normal';

    if (currentPosition !== newPosition) {
      setHeaderPosition(newPosition);

      if (shouldBeSticky) {
        if (header) {
          const headerHeight = header.offsetHeight;
          // Add padding to body to prevent layout shift
          document.body.style.paddingTop = `${headerHeight}px`;

          header.style.position = 'fixed';
          header.style.top = '0';
          header.style.left = '0';
          header.style.right = '0';
          header.style.zIndex = '101';
        }
      } else {
        if (header) {
          // Remove padding when header is not fixed
          document.body.style.paddingTop = '';

          header.style.position = '';
          header.style.top = '';
          header.style.left = '';
          header.style.right = '';
          header.style.zIndex = '';
        }
      }
    }

    // Update tool mode nav position and main content margin
    if (toolModeNav && window.innerWidth >= 801) {
      if (shouldBeSticky) {
        // On desktop, make nav fixed when header is sticky
        toolModeNav.classList.remove('md:static');
        toolModeNav.classList.add('md:fixed');
        toolModeNav.style.top = '60px'; // Below fixed header
        toolModeNav.style.left = '0';

        // Add margin to main content when nav becomes fixed (nav no longer takes flex space)
        if (mainContent) {
          mainContent.classList.add('md:ml-16');
        }
      } else {
        // Normal static positioning when header is visible
        toolModeNav.classList.remove('md:fixed');
        toolModeNav.classList.add('md:static');
        toolModeNav.style.top = '';
        toolModeNav.style.left = '';

        // Remove margin from main content when nav is static (nav takes flex space naturally)
        if (mainContent) {
          mainContent.classList.remove('md:ml-16');
        }
      }
    }
  };

  // Handle resize events
  const handleResize = () => {
    updateHeaderHeight();
    updateSettingsMargin();

    // Handle desktop/mobile breakpoint transitions
    const isMobile = window.innerWidth < 801;

    if (isMobile && toolModeNav && mainContent) {
      // Force reset to mobile layout
      toolModeNav.classList.remove('md:fixed', 'md:static');
      toolModeNav.style.top = '';
      toolModeNav.style.left = '';

      // Remove desktop margin
      mainContent.classList.remove('md:ml-16');
    }

    // Re-run scroll logic to handle desktop/mobile transitions
    handleScroll();
  };

  // Listen for settings panel state changes
  const handleSettingsPanelChange = () => {
    const isSettingsOpen = settingsPanelOpenStore.get();

    // Reset scroll flag when panel state changes
    if (!isSettingsOpen) {
      hasScrolledForSettingsPanel = false;
    }
  };

  // Set up event listeners
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);

  // Subscribe to settings panel state changes
  settingsPanelOpenStore.subscribe(handleSettingsPanelChange);

  // Initial setup
  updateHeaderHeight();
  updateSettingsMargin();
  handleScroll();
}

/**
 * Handle settings panel mobile behavior
 * This is called when the settings panel is toggled
 */
export function handleSettingsPanelMobile(isOpen: boolean): void {
  const isMobile = window.innerWidth < 801;

  if (!isMobile) return;

  if (isOpen) {
    const header = document.querySelector('header');
    const headerHeight = header?.offsetHeight || 0;
    const currentScrollY = window.scrollY;

    // Only scroll if we're near the top and haven't already scrolled
    if (currentScrollY <= headerHeight && !hasScrolledForSettingsPanel) {
      window.scrollTo({
        top: headerHeight + 10,
        behavior: 'smooth',
      });
      hasScrolledForSettingsPanel = true;
    }

    // Fade the header
    setMobileHeaderFaded(true);
  } else {
    // Unfade the header and reset scroll flag
    setMobileHeaderFaded(false);
    hasScrolledForSettingsPanel = false;
  }
}

// TractStack Shoelace Initialization
// Initializes select and switch components

import SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
import SlSwitch from '@shoelace-style/shoelace/dist/components/switch/switch.js';

// Register Shoelace components
customElements.define('sl-select', SlSelect);
customElements.define('sl-switch', SlSwitch);

// Initialize Shoelace components
function initializeShoelace() {
  console.log('🎯 TractStack: Initializing Shoelace components...');

  // Handle select components
  const selectElements = document.querySelectorAll<SlSelect>(
    'sl-select[data-shoelace="select"]'
  );
  console.log(`🎯 Found ${selectElements.length} select components`);

  selectElements.forEach((select, index) => {
    console.log(`🎯 Processing select ${index + 1}:`, select);
    // Ensure HTMX attributes are processed
    window.htmx.process(select);
    // Add sl-change listener for HTMX submission
    select.addEventListener('sl-change', () => {
      console.log(`Select ${index + 1} changed to:`, select.value);
      window.htmx.trigger(select, 'refresh');
    });
  });

  // Handle switch components
  const switchElements = document.querySelectorAll<SlSwitch>(
    'sl-switch[data-shoelace="switch"]'
  );
  console.log(`🔄 Found ${switchElements.length} switch components`);

  switchElements.forEach((sw, index) => {
    console.log(`🔄 Processing switch ${index + 1}:`, sw);
    // Ensure HTMX attributes are processed
    window.htmx.process(sw);
    // Add sl-change listener for HTMX submission
    sw.addEventListener('sl-change', () => {
      console.log(`Switch ${index + 1} changed to:`, sw.checked);
      window.htmx.trigger(sw, 'refresh');
    });
  });

  console.log('🎯 Shoelace initialization complete');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOMContentLoaded: Initializing Shoelace');
  initializeShoelace();
});

document.body.addEventListener('htmx:afterSwap', () => {
  console.log('🔄 HTMX afterSwap: Re-initializing Shoelace');
  setTimeout(() => {
    window.htmx.process(document.body);
    initializeShoelace();
  }, 0);
});

document.addEventListener('astro:after-swap', () => {
  console.log('🔄 Astro after-swap: Re-initializing Shoelace');
  window.htmx.process(document.body);
  setTimeout(initializeShoelace, 0);
});

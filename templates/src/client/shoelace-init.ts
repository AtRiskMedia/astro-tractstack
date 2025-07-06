import SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
import SlSwitch from '@shoelace-style/shoelace/dist/components/switch/switch.js';
import SlOption from '@shoelace-style/shoelace/dist/components/option/option.js';

// TypeScript declarations
declare global {
  interface Window {
    TENANT_ID?: string;
    PUBLIC_GO_BACKEND?: string;
    STORYFRAGMENT_ID?: string;
  }
}

// Shoelace event interfaces
interface ShoelaceChangeEvent extends Event {
  detail?: {
    item?: {
      value: string;
    };
  };
  target: HTMLElement & {
    value?: string | string[];
    checked?: boolean;
    getAttribute(name: string): string | null;
  };
}

interface BeliefUpdateData {
  [key: string]: string;
  beliefId: string;
  beliefType: string;
  beliefValue: string;
}

// Extend SlSelect to prevent auto-focus when no-autofocus attribute is present
class CustomSlSelect extends SlSelect {
  focus(options?: FocusOptions) {
    if (this.hasAttribute('no-autofocus')) {
      console.log(`🔍 SHOELACE: Skipping focus for sl-select#${this.id} due to no-autofocus`);
      return;
    }
    super.focus(options);
  }
}

// Register Shoelace components
if (!customElements.get('sl-select')) {
  customElements.define('sl-select', CustomSlSelect);
}
if (!customElements.get('sl-switch')) {
  customElements.define('sl-switch', SlSwitch);
}
if (!customElements.get('sl-option')) {
  customElements.define('sl-option', SlOption);
}

// Debounce function to limit function calls within a time window
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Set up Shoelace event handlers
function setupShoelaceEventHandlers(): void {
  console.log('🔧 SHOELACE: Setting up event handlers');

  const selectCount = document.querySelectorAll('sl-select[data-shoelace="select"]').length;
  console.log(`🔍 SHOELACE: Found ${selectCount} sl-select elements`);

  // Handle sl-select changes
  document.querySelectorAll('sl-select[data-shoelace="select"]').forEach((select) => {
    const slSelect = select as CustomSlSelect;
    if (slSelect.shadowRoot && slSelect.hasAttribute('data-shoelace-initialized')) {
      console.log(`🔍 SHOELACE: Skipping reinitialization for sl-select#${slSelect.id}`);
      return;
    }
    console.log(`🔍 SHOELACE: Initializing sl-select#${slSelect.id}, shadowRoot: ${slSelect.shadowRoot !== null}`);
    slSelect.removeEventListener('sl-change', handleSelectChange as EventListener);
    slSelect.addEventListener('sl-change', handleSelectChange as EventListener);
    slSelect.disconnectedCallback?.();
    slSelect.connectedCallback?.();
    slSelect.setAttribute('data-shoelace-initialized', 'true');
  });

  const switchCount = document.querySelectorAll('sl-switch[data-shoelace="switch"]').length;
  console.log(`🔍 SHOELACE: Found ${switchCount} sl-switch elements`);

  // Handle sl-switch changes
  document.querySelectorAll('sl-switch[data-shoelace="switch"]').forEach((switchEl) => {
    const slSwitch = switchEl as SlSwitch;
    if (slSwitch.shadowRoot && slSwitch.hasAttribute('data-shoelace-initialized')) {
      console.log(`🔍 SHOELACE: Skipping reinitialization for sl-switch#${slSwitch.id}`);
      return;
    }
    console.log(`🔍 SHOELACE: Initializing sl-switch#${slSwitch.id}, shadowRoot: ${slSwitch.shadowRoot !== null}`);
    slSwitch.removeEventListener('sl-change', handleSwitchChange as EventListener);
    slSwitch.addEventListener('sl-change', handleSwitchChange as EventListener);
    slSwitch.disconnectedCallback?.();
    slSwitch.connectedCallback?.();
    slSwitch.setAttribute('data-shoelace-initialized', 'true');
  });

  console.log('✅ SHOELACE: Event handlers setup complete');
}

// Debounced version of setupShoelaceEventHandlers
const debouncedSetupShoelaceEventHandlers = debounce(setupShoelaceEventHandlers, 200);

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function () {
  console.log('📄 DOM: DOMContentLoaded, setting up Shoelace handlers');
  setupShoelaceEventHandlers();
});

// Reinitialize after HTMX swaps
document.body.addEventListener('htmx:afterSwap', function (evt: any) {
  const target = evt.detail?.target;
  console.log('🔄 HTMX: afterSwap for element:', target?.id || target);
  target.querySelectorAll('sl-select').forEach((select: CustomSlSelect) => {
    const attrValue = select.getAttribute('value');
    if (select.value === '' && attrValue !== null && attrValue !== '') {
      console.log(`🔍 SHOELACE: Fixing empty value for sl-select#${select.id}`);
      select.value = attrValue;
    }
    console.log('🔍 SHOELACE: sl-select state:', {
      id: select.id,
      hasShadowRoot: select.shadowRoot !== null,
      value: select.value,
      noAutofocus: select.hasAttribute('no-autofocus')
    });
  });
  target.querySelectorAll('sl-switch').forEach((switchEl: SlSwitch) => {
    console.log('🔍 SHOELACE: sl-switch state:', {
      id: switchEl.id,
      hasShadowRoot: switchEl.shadowRoot !== null,
      checked: switchEl.checked
    });
  });
  debouncedSetupShoelaceEventHandlers();
});

// Debug HTMX swap process
document.body.addEventListener('htmx:beforeSwap', function (evt: any) {
  console.log('🔄 HTMX: Before swap for element:', evt.detail?.target?.id || evt.detail?.target || evt.target);
  console.log('🔄 HTMX: Incoming content length:', evt.detail?.xhr?.responseText?.length || 'unknown');
});

// Handle sl-select changes
async function handleSelectChange(event: Event): Promise<void> {
  const shoelaceEvent = event as ShoelaceChangeEvent;
  const select = shoelaceEvent.target as CustomSlSelect;
  const beliefId = select.getAttribute('data-belief-id');
  const beliefType = select.getAttribute('data-belief-type');
  const rawValue = shoelaceEvent.detail?.item?.value || select.value;
  const beliefValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  if (!beliefId || !beliefType || !beliefValue) {
    console.error('🔴 SHOELACE: Invalid belief data for sl-select#', select.id, { beliefId, beliefType, beliefValue });
    return;
  }

  console.log('🔄 SHOELACE: Select changed:', { beliefId, beliefType, beliefValue });
  await sendBeliefUpdate({ beliefId, beliefType, beliefValue });
}

// Handle sl-switch changes
async function handleSwitchChange(event: Event): Promise<void> {
  const shoelaceEvent = event as ShoelaceChangeEvent;
  const switchEl = shoelaceEvent.target;
  const beliefId = switchEl.getAttribute('data-belief-id');
  const beliefType = switchEl.getAttribute('data-belief-type');
  const beliefValue = switchEl.checked ? 'BELIEVES_YES' : 'BELIEVES_NO';

  if (!beliefId || !beliefType) {
    console.error('🔴 SHOELACE: Missing belief data attributes on sl-switch#', switchEl.id);
    return;
  }

  console.log('🔄 SHOELACE: Switch changed:', { beliefId, beliefType, beliefValue });
  await sendBeliefUpdate({ beliefId, beliefType, beliefValue });
}

// Send belief update to backend
async function sendBeliefUpdate(data: BeliefUpdateData): Promise<void> {
  try {
    const goBackend = window.PUBLIC_GO_BACKEND || 'http://localhost:8080';
    const sessionId = localStorage.getItem('tractstack_session_id');
    console.log('📡 SHOELACE: Sending belief update:', { data, sessionId, goBackend });

    const response = await fetch(`${goBackend}/api/v1/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Tenant-ID': window.TENANT_ID || 'default',
        'X-TractStack-Session-ID': sessionId || '',
        'X-StoryFragment-ID': window.STORYFRAGMENT_ID || '',
      },
      body: new URLSearchParams(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ SHOELACE: Belief update successful:', result);
  } catch (error) {
    console.error('🔴 SHOELACE: Failed to update belief:', error);
  }
}

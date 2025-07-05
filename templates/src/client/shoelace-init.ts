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
    value?: string;
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

// Register Shoelace components
if (!customElements.get('sl-select')) {
  customElements.define('sl-select', SlSelect);
}
if (!customElements.get('sl-switch')) {
  customElements.define('sl-switch', SlSwitch);
}
if (!customElements.get('sl-option')) {
  customElements.define('sl-option', SlOption);
}

// Handle Shoelace events with fetch
document.addEventListener('DOMContentLoaded', function () {
  setupShoelaceEventHandlers();
});

// Also re-setup after HTMX swaps
document.body.addEventListener('htmx:afterSwap', function (evt) {
  setupShoelaceEventHandlers();
});

function setupShoelaceEventHandlers(): void {
  // Handle sl-select changes
  document.querySelectorAll('sl-select[data-shoelace="select"]').forEach(select => {
    // Remove existing listeners to avoid duplicates
    select.removeEventListener('sl-change', handleSelectChange as EventListener);
    select.addEventListener('sl-change', handleSelectChange as EventListener);
  });

  // Handle sl-switch changes  
  document.querySelectorAll('sl-switch[data-shoelace="switch"]').forEach(switchEl => {
    switchEl.removeEventListener('sl-change', handleSwitchChange as EventListener);
    switchEl.addEventListener('sl-change', handleSwitchChange as EventListener);
  });
}

async function handleSelectChange(event: Event): Promise<void> {
  const shoelaceEvent = event as ShoelaceChangeEvent;
  const select = shoelaceEvent.target;
  const beliefId = select.getAttribute('data-belief-id');
  const beliefType = select.getAttribute('data-belief-type');
  const beliefValue = shoelaceEvent.detail?.item?.value || select.value || '';

  if (!beliefId || !beliefType) {
    console.error('Missing belief data attributes on select element');
    return;
  }

  console.log('Select changed:', { beliefId, beliefType, beliefValue });

  await sendBeliefUpdate({ beliefId, beliefType, beliefValue });
}

async function handleSwitchChange(event: Event): Promise<void> {
  const shoelaceEvent = event as ShoelaceChangeEvent;
  const switchEl = shoelaceEvent.target;
  const beliefId = switchEl.getAttribute('data-belief-id');
  const beliefType = switchEl.getAttribute('data-belief-type');
  const beliefValue = switchEl.checked ? 'BELIEVES_YES' : 'BELIEVES_NO';

  if (!beliefId || !beliefType) {
    console.error('Missing belief data attributes on switch element');
    return;
  }

  console.log('Switch changed:', { beliefId, beliefType, beliefValue });

  await sendBeliefUpdate({ beliefId, beliefType, beliefValue });
}

async function sendBeliefUpdate(data: BeliefUpdateData): Promise<void> {
  try {
    const goBackend = window.PUBLIC_GO_BACKEND || 'http://localhost:8080';
    const sessionId = localStorage.getItem('tractstack_session_id');
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
    console.log('Belief update successful:', result);

  } catch (error) {
    console.error('Failed to update belief:', error);
  }
}

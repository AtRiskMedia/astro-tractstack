const VERBOSE = false;

interface BeliefUpdateData {
  [key: string]: string;
  beliefId: string;
  beliefType: string;
  beliefValue: string;
}

// Single event delegation handler for all belief widgets
document.addEventListener('change', function (event: Event) {
  if (VERBOSE) console.log('🔥 CHANGE EVENT FIRED:', event.target);

  const target = event.target as HTMLElement;

  // Handle belief selects
  if (target.matches && target.matches('select[data-belief-id]')) {
    if (VERBOSE) console.log('🎯 BELIEF SELECT MATCHED:', target);
    handleBeliefChange(target as HTMLSelectElement);
  }

  // Handle belief toggles (checkboxes)
  if (
    target.matches &&
    target.matches('input[type="checkbox"][data-belief-id]')
  ) {
    if (VERBOSE) console.log('🎯 BELIEF CHECKBOX MATCHED:', target);
    handleBeliefChange(target as HTMLInputElement);
  }
});

// Single event delegation handler for all belief widgets
document.addEventListener('change', function (event: Event) {
  const target = event.target as HTMLElement;

  // Handle belief selects
  if (target.matches && target.matches('select[data-belief-id]')) {
    handleBeliefChange(target as HTMLSelectElement);
  }

  // Handle belief toggles (checkboxes)
  if (
    target.matches &&
    target.matches('input[type="checkbox"][data-belief-id]')
  ) {
    handleBeliefChange(target as HTMLInputElement);
  }
});

// Handle belief widget changes
async function handleBeliefChange(
  element: HTMLSelectElement | HTMLInputElement
): Promise<void> {
  const beliefId = element.getAttribute('data-belief-id');
  const beliefType = element.getAttribute('data-belief-type');

  if (!beliefId || !beliefType) {
    if (VERBOSE)
      console.error(
        '🔴 BELIEF: Missing belief data attributes on element#',
        element.id
      );
    return;
  }

  // Extract value based on element type
  let beliefValue: string;
  if (element.type === 'checkbox') {
    beliefValue = (element as HTMLInputElement).checked
      ? 'BELIEVES_YES'
      : 'BELIEVES_NO';
  } else {
    beliefValue = (element as HTMLSelectElement).value;
  }

  if (VERBOSE)
    console.log('🔄 BELIEF: Widget changed:', {
      beliefId,
      beliefType,
      beliefValue,
    });

  // Track the state change
  trackBeliefState(beliefId, beliefValue);

  await sendBeliefUpdate({ beliefId, beliefType, beliefValue });
}

// Send belief update to backend - same logic as shoelace version
async function sendBeliefUpdate(data: BeliefUpdateData): Promise<void> {
  try {
    const goBackend =
      (window as any).PUBLIC_GO_BACKEND || 'http://localhost:8080';
    const sessionId = localStorage.getItem('tractstack_session_id');

    if (VERBOSE)
      console.log('📡 BELIEF: Sending belief update:', {
        data,
        sessionId,
        goBackend,
      });

    const response = await fetch(`${goBackend}/api/v1/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Tenant-ID': (window as any).TENANT_ID || 'default',
        'X-TractStack-Session-ID': sessionId || '',
        'X-StoryFragment-ID': (window as any).STORYFRAGMENT_ID || '',
      },
      body: new URLSearchParams(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (VERBOSE) console.log('✅ BELIEF: Belief update successful:', result);
  } catch (error) {
    console.error('🔴 BELIEF: Failed to update belief:', error);
  }
}

// Debug logging for development
if (VERBOSE) {
  console.log('🔧 BELIEF: Event handlers initialized');
}

// Restore widget states after HTMX swaps
document.body.addEventListener('htmx:afterSwap', function (event: any) {
  if (VERBOSE) {
    console.log('🔄 HTMX: afterSwap detected, restoring widget states');
  }

  // Small delay to ensure DOM is ready
  setTimeout(restoreWidgetStates, 10);
});

// Track current belief states in memory
const beliefStates: { [key: string]: string } = {};

// Update belief states tracking when changes occur
function trackBeliefState(beliefId: string, beliefValue: string) {
  beliefStates[beliefId] = beliefValue;
  if (VERBOSE) {
    console.log('📝 BELIEF: Tracked state update:', { beliefId, beliefValue });
  }
}

// Restore widget states after HTMX content swaps
function restoreWidgetStates() {
  // Restore select elements
  document.querySelectorAll('select[data-belief-id]').forEach((select) => {
    const beliefId = select.getAttribute('data-belief-id');
    if (beliefId && beliefStates[beliefId]) {
      (select as HTMLSelectElement).value = beliefStates[beliefId];
      if (VERBOSE) {
        console.log('🔄 BELIEF: Restored select state:', {
          beliefId,
          value: beliefStates[beliefId],
        });
      }
    }
  });

  // Restore checkbox elements
  document
    .querySelectorAll('input[type="checkbox"][data-belief-id]')
    .forEach((checkbox) => {
      const beliefId = checkbox.getAttribute('data-belief-id');
      if (beliefId && beliefStates[beliefId]) {
        (checkbox as HTMLInputElement).checked =
          beliefStates[beliefId] === 'BELIEVES_YES';
        if (VERBOSE) {
          console.log('🔄 BELIEF: Restored checkbox state:', {
            beliefId,
            checked: beliefStates[beliefId] === 'BELIEVES_YES',
          });
        }
      }
    });
}

const VERBOSE = false;

interface BeliefUpdateData {
  [key: string]: string;
  beliefId: string;
  beliefType: string;
  beliefValue: string;
  paneId: string;
}

// Initialize beliefStates
const beliefStates: { [key: string]: string } = {};

//function clearBeliefStates() {
//  const previousState = { ...beliefStates };
//  Object.keys(beliefStates).forEach((key) => delete beliefStates[key]);
//  if (VERBOSE && Object.keys(previousState).length > 0) {
//    console.log(
//      '🔧 BELIEF: Cleared beliefStates, previous state:',
//      previousState
//    );
//  } else if (VERBOSE) {
//    console.log('🔧 BELIEF: Cleared beliefStates, no previous state');
//  }
//}

// Clear state immediately on script load and before HTMX/DOM events
//clearBeliefStates(); // Immediate clear on script execution
//window.addEventListener('load', clearBeliefStates);
//document.addEventListener('htmx:configRequest', clearBeliefStates);

// Single event delegation handler for all belief widgets
document.addEventListener('change', function (event: Event) {
  const target = event.target as HTMLElement;

  if (target.matches && target.matches('select[data-belief-id]')) {
    handleBeliefChange(target as HTMLSelectElement);
  } else if (
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
  const paneId = element.getAttribute('data-pane-id');

  if (!beliefId || !beliefType) {
    if (VERBOSE)
      console.error('🔴 BELIEF: Missing required attributes on', element.id);
    return;
  }

  let beliefValue: string;
  if (element.type === 'checkbox') {
    beliefValue = (element as HTMLInputElement).checked
      ? 'BELIEVES_YES'
      : 'BELIEVES_NO';
  } else {
    beliefValue = (element as HTMLSelectElement).value;
  }

  if (VERBOSE)
    console.log('🔄 BELIEF: Widget changed', {
      beliefId,
      beliefType,
      beliefValue,
      paneId,
    });

  trackBeliefState(beliefId, beliefValue);
  await sendBeliefUpdate({
    beliefId,
    beliefType,
    beliefValue,
    paneId: paneId || '',
  });
}

// Send belief update to backend
async function sendBeliefUpdate(data: BeliefUpdateData): Promise<void> {
  try {
    const goBackend =
      (window as any).PUBLIC_GO_BACKEND || 'http://localhost:8080';
    const sessionId = localStorage.getItem('tractstack_session_id');

    if (VERBOSE)
      console.log('📡 BELIEF: Sending update to', goBackend, {
        data,
        sessionId,
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

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();
    if (VERBOSE)
      console.log('✅ BELIEF: Update successful', {
        beliefId: data.beliefId,
        result,
      });
    if (result.unsetBeliefs && Array.isArray(result.unsetBeliefs) && result.unsetBeliefs.includes(data.beliefId)) {
      delete beliefStates[data.beliefId];
      if (VERBOSE)
        console.log('🔄 BELIEF: Cleared beliefStates (server instructed unset)', {
          beliefId: data.beliefId,
        });
    } else {
      // Keep local state for restoration - normal success response
      if (VERBOSE)
        console.log('🔄 BELIEF: Keeping local state for restoration', {
          beliefId: data.beliefId,
        });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (VERBOSE)
      console.error('🔴 BELIEF: Update failed', {
        error: errorMessage,
        beliefId: data.beliefId,
      });
  }
}

// Initialize event handlers
if (VERBOSE) console.log('🔧 BELIEF: Event handlers initialized');

//// Restore widget states after HTMX swaps with safe logic
//document.body.addEventListener('htmx:afterSwap', function (event) {
//  if (VERBOSE)
//    console.log('🔄 HTMX: afterSwap triggered, checking for restoration');
//  setTimeout(restoreWidgetStates, 10); // Delay for DOM readiness
//});

function trackBeliefState(beliefId: string, beliefValue: string) {
  beliefStates[beliefId] = beliefValue;
  if (VERBOSE)
    console.log('📝 BELIEF: Tracked state', { beliefId, beliefValue });
}

//function restoreWidgetStates() {
//  if (VERBOSE)
//    console.log('🔄 BELIEF: Entering restoreWidgetStates', {
//      beliefStates: { ...beliefStates },
//    });
//
//  document.querySelectorAll('select[data-belief-id]').forEach((select) => {
//    const beliefId = select.getAttribute('data-belief-id');
//    if (beliefId && beliefStates[beliefId]) {
//      const currentValue = (select as HTMLSelectElement).value;
//      const storedValue = beliefStates[beliefId];
//      const validOptions = Array.from((select as HTMLSelectElement).options)
//        .filter((option) => option.value !== '') // Exclude placeholder
//        .map((option) => option.value);
//
//      // Don't restore UNSET values - they should remain as placeholder
//      if (storedValue === 'UNSET') {
//        if (VERBOSE)
//          console.log('🔄 BELIEF: Skipped restoration of UNSET value', {
//            beliefId,
//            reason: 'UNSET values should not be restored',
//          });
//        return;
//      }
//
//      if (currentValue === '' && validOptions.includes(storedValue)) {
//        (select as HTMLSelectElement).value = storedValue;
//        if (VERBOSE)
//          console.log('🔄 BELIEF: Restored state', {
//            beliefId,
//            value: storedValue,
//            reason: 'Placeholder overridden with tracked state',
//          });
//      } else if (VERBOSE) {
//        console.log('🔄 BELIEF: Skipped restoration', {
//          beliefId,
//          currentValue,
//          storedValue,
//          reason:
//            currentValue !== ''
//              ? 'Server state present'
//              : 'Invalid stored value',
//          validOptions,
//        });
//      }
//    }
//  });
//
//  document
//    .querySelectorAll('input[type="checkbox"][data-belief-id]')
//    .forEach((checkbox) => {
//      const beliefId = checkbox.getAttribute('data-belief-id');
//      if (beliefId && beliefStates[beliefId]) {
//        const storedValue = beliefStates[beliefId];
//
//        // Don't restore UNSET values for checkboxes either
//        if (storedValue === 'UNSET') {
//          if (VERBOSE)
//            console.log('🔄 BELIEF: Skipped checkbox restoration of UNSET value', {
//              beliefId,
//              reason: 'UNSET values should not be restored',
//            });
//          return;
//        }
//
//        if (storedValue === 'BELIEVES_YES' || storedValue === 'BELIEVES_NO') {
//          (checkbox as HTMLInputElement).checked =
//            storedValue === 'BELIEVES_YES';
//          if (VERBOSE)
//            console.log('🔄 BELIEF: Restored checkbox', {
//              beliefId,
//              checked: storedValue === 'BELIEVES_YES',
//            });
//        }
//      }
//    });
//}

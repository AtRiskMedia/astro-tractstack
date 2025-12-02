import { getCtx } from '@/stores/nodes';
import { TractStackAPI } from '@/utils/api';
import { pendingHomePageSlugStore } from '@/stores/storykeep';
import type { FullContentMapItem } from '@/types/tractstack';
import type { LoadData, TractStackNode } from '@/types/compositorTypes';

const VERBOSE = false;

export interface SetupWizardState {
  email: string;
  adminPassword: string;
  confirmPassword: string;
  tursoEnabled: boolean;
  tursoDatabaseURL: string;
  tursoAuthToken: string;
}

export const initialSetupState: SetupWizardState = {
  email: '',
  adminPassword: '',
  confirmPassword: '',
  tursoEnabled: false,
  tursoDatabaseURL: '',
  tursoAuthToken: '',
};

export function setupStateIntercept(
  newState: SetupWizardState,
  field: keyof SetupWizardState,
  value: any
): SetupWizardState {
  if (VERBOSE)
    console.log(
      `[setupStateIntercept] Intercepting field: ${String(field)}, Value:`,
      value
    );

  if (field === 'tursoEnabled' && !value) {
    const result = {
      ...newState,
      tursoEnabled: false,
      tursoDatabaseURL: '',
      tursoAuthToken: '',
    };
    if (VERBOSE)
      console.log(
        '[setupStateIntercept] Turso disabled. Resetting Turso fields.',
        result
      );
    return result;
  }

  if (field === 'adminPassword') {
    const result = {
      ...newState,
      adminPassword: value,
      confirmPassword: '',
    };
    if (VERBOSE)
      console.log(
        '[setupStateIntercept] Admin password changed. Clearing confirm password.'
      );
    return result;
  }

  if (VERBOSE)
    console.log(
      '[setupStateIntercept] No special handling required. Returning new state.'
    );
  return newState;
}

export function validateSetup(state: SetupWizardState): Record<string, string> {
  if (VERBOSE)
    console.log('[validateSetup] Starting validation for state:', state);
  const errors: Record<string, string> = {};

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!state.email.trim()) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(state.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (!state.adminPassword.trim()) {
    errors.adminPassword = 'Admin password is required';
  } else if (state.adminPassword.length < 8) {
    errors.adminPassword = 'Admin password must be at least 8 characters long';
  }

  if (!errors.adminPassword && state.adminPassword !== state.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (state.tursoEnabled) {
    if (!state.tursoDatabaseURL.trim()) {
      errors.tursoDatabaseURL = 'Turso Database URL is required';
    } else if (!state.tursoDatabaseURL.startsWith('libsql://')) {
      errors.tursoDatabaseURL =
        'Turso Database URL must start with "libsql://"';
    }

    if (!state.tursoAuthToken.trim()) {
      errors.tursoAuthToken = 'Turso Auth Token is required';
    }
  }

  if (Object.keys(errors).length > 0) {
    if (VERBOSE)
      console.error('[validateSetup] Validation failed with errors:', errors);
  } else {
    if (VERBOSE) console.log('[validateSetup] Validation successful.');
  }

  return errors;
}

export async function initializeSystem(state: SetupWizardState): Promise<void> {
  if (VERBOSE)
    console.log('[initializeSystem] Starting system initialization.');

  const tenantId =
    window.TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  const api = new TractStackAPI(tenantId);

  const payload = {
    adminEmail: state.email.trim(),
    adminPassword: state.adminPassword.trim(),
    ...(state.tursoEnabled && {
      tursoDatabaseURL: state.tursoDatabaseURL.trim(),
      tursoAuthToken: state.tursoAuthToken.trim(),
    }),
  };

  const endpoint = '/api/v1/setup/initialize';
  if (VERBOSE)
    console.log(
      `[initializeSystem] POSTing to ${endpoint}. Payload (passwords masked):`,
      {
        ...payload,
        adminPassword: '***',
      }
    );

  const response = await api.post(endpoint, payload);
  if (VERBOSE)
    console.log('[initializeSystem] API Response received:', response);

  if (!response.success) {
    const errorMessage = response.error || 'Setup failed';
    if (VERBOSE)
      console.error('[initializeSystem] Setup failed. Throwing error.');
    throw new Error(errorMessage);
  }

  if (VERBOSE)
    console.log('[initializeSystem] System initialization successful.');
}

function forceMarkAllDirty(ctx: any) {
  if (VERBOSE)
    console.log('[forceMarkAllDirty] Flagging all nodes for SaveModal...');
  const allNodes = Array.from(ctx.allNodes.get().values());
  const dirtyUpdates = allNodes.map((n: any) => ({ ...n, isChanged: true }));
  ctx.modifyNodes(dirtyUpdates);
}

export function prepareHydrationContext(
  data: LoadData,
  fullContentMap?: FullContentMapItem[]
): void {
  if (VERBOSE)
    console.log(
      '[prepareHydrationContext] Preparing context for suitcase hydration.'
    );

  const ctx = getCtx();

  if (!fullContentMap) {
    throw new Error(
      'Content map is required for suitcase installation to perform strict takeover.'
    );
  }

  const tractStackNodeItem = fullContentMap.find(
    (n) => n.type === 'TractStack'
  );
  if (!tractStackNodeItem) {
    throw new Error(
      'Missing TractStack node in content map. Cannot link content.'
    );
  }

  const helloFragment = fullContentMap.find(
    (n) =>
      (n.type === 'StoryFragment' || n.type === 'StoryFragment') &&
      n.slug === 'hello'
  );
  if (!helloFragment) {
    throw new Error(
      "Missing 'hello' StoryFragment in content map. Cannot perform takeover."
    );
  }

  if (!data.storyfragmentNodes || data.storyfragmentNodes.length !== 1) {
    throw new Error(
      'Suitcase must contain exactly one StoryFragment for takeover hydration.'
    );
  }

  const incomingFragment = data.storyfragmentNodes[0];
  const oldId = incomingFragment.id;
  const targetId = helloFragment.id;

  if (VERBOSE)
    console.log(
      `[prepareHydrationContext] TAKEOVER: Mapping 'hello' (${targetId}) with content from '${incomingFragment.title}'`
    );

  incomingFragment.id = targetId;
  incomingFragment.slug = 'hello';
  incomingFragment.tractStackId = tractStackNodeItem.id;
  incomingFragment.parentId = tractStackNodeItem.id;

  if (!data.tractstackNodes) {
    data.tractstackNodes = [];
  }
  const rootTractStack = {
    id: tractStackNodeItem.id,
    nodeType: 'TractStack' as const,
    parentId: null,
    title: tractStackNodeItem.title || 'Tract Stack',
    slug: tractStackNodeItem.slug || 'root',
    socialImagePath: '',
  };
  data.tractstackNodes.push(rootTractStack as TractStackNode);

  if (data.paneNodes) {
    let patchedPanes = 0;
    data.paneNodes.forEach((pane) => {
      if (pane.parentId === oldId) {
        pane.parentId = targetId;
        patchedPanes++;
      }
    });
    if (VERBOSE)
      console.log(
        `[prepareHydrationContext] Re-parented ${patchedPanes} panes from ${oldId} to ${targetId}`
      );
  }

  if (VERBOSE)
    console.log(`[prepareHydrationContext] Building the Nodes Context tree`);

  ctx.buildNodesTreeFromRowDataMadeNodes(data);

  if (VERBOSE)
    console.log(
      `[prepareHydrationContext] Marking the Nodes Context tree as dirty`
    );
  forceMarkAllDirty(ctx);

  if (VERBOSE)
    console.log(
      '[prepareHydrationContext] Setting pending home page slug to "hello"'
    );
  pendingHomePageSlugStore.set('hello');
}

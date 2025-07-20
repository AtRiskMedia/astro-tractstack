import { TractStackAPI } from '../api';
import { convertToBackendFormat, convertToLocalState } from './menuHelpers';
import type { MenuNode, MenuNodeState } from '@/types/tractstack';

/**
 * Save an existing menu
 */
export async function saveMenu(
  tenantId: string,
  menuState: MenuNodeState
): Promise<MenuNode> {
  const api = new TractStackAPI(tenantId);
  const menuData = convertToBackendFormat(menuState);

  const response = await api.put(
    `/api/v1/nodes/menus/${menuState.id}`,
    menuData
  );
  return response.data as MenuNode;
}

/**
 * Create a new menu
 */
export async function createMenu(
  tenantId: string,
  menuState: MenuNodeState
): Promise<MenuNode> {
  const api = new TractStackAPI(tenantId);
  const menuData = convertToBackendFormat(menuState);

  const response = await api.post('/api/v1/nodes/menus/create', menuData);
  return response.data as MenuNode;
}

/**
 * Delete a menu
 */
export async function deleteMenu(
  tenantId: string,
  menuId: string
): Promise<void> {
  const api = new TractStackAPI(tenantId);
  await api.request(`/api/v1/nodes/menus/${menuId}`, { method: 'DELETE' });
}

/**
 * Get a menu by ID
 */
export async function getMenuById(
  tenantId: string,
  menuId: string
): Promise<MenuNode> {
  const api = new TractStackAPI(tenantId);
  const response = await api.get(`/api/v1/nodes/menus/${menuId}`);
  return response.data as MenuNode;
}

/**
 * Main save workflow with state update
 * Following the exact pattern from brandConfig.ts
 */
export async function saveMenuWithStateUpdate(
  tenantId: string,
  currentState: MenuNodeState,
  originalState: MenuNodeState
): Promise<MenuNodeState> {
  try {
    let savedMenu: MenuNode;

    // Determine if this is a create or update operation
    const isCreate = !currentState.id || currentState.id === '';

    if (isCreate) {
      // Generate temporary ID for create (backend will assign real ID)
      const tempState = { ...currentState, id: crypto.randomUUID() };
      savedMenu = await createMenu(tenantId, tempState);
    } else {
      savedMenu = await saveMenu(tenantId, currentState);
    }

    // Convert the saved menu back to state format
    return convertToLocalState(savedMenu);
  } catch (error) {
    console.error('Menu save failed:', error);
    throw error;
  }
}

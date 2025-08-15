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

import { TractStackAPI } from '../api';
import { convertToLocalState, convertToBackendFormat } from './resourceHelpers';
import type { ResourceConfig, ResourceState } from '@/types/tractstack';

/**
 * Save resource - handles both create and update operations
 */
export async function saveResource(
  tenantId: string,
  resource: Partial<ResourceConfig> & { id?: string }
): Promise<ResourceConfig> {
  const api = new TractStackAPI(tenantId);
  try {
    const isCreate = !resource.id || resource.id === '';

    let response;

    if (isCreate) {
      // Create new resource
      response = await api.post<ResourceConfig>(
        '/api/v1/nodes/resources/create',
        resource
      );
    } else {
      // Update existing resource
      response = await api.put<ResourceConfig>(
        `/api/v1/nodes/resources/${resource.id}`,
        resource
      );
    }

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to save resource');
    }

    return response.data;
  } catch (error) {
    console.error('saveResource error:', error);

    if (error instanceof Error) {
      // Check if it's a JSON parsing error (from the error message)
      if (
        error.message.includes('Unexpected non-whitespace character after JSON')
      ) {
        throw new Error(
          'Server returned invalid JSON response. Please check the backend logs.'
        );
      }
      throw error;
    }

    throw new Error('Failed to save resource');
  }
}

export async function createResource(
  tenantId: string,
  resource: Omit<ResourceConfig, 'id'>
): Promise<ResourceConfig> {
  const api = new TractStackAPI(tenantId);
  const response = await api.post('/api/v1/nodes/resources/create', resource);
  if (!response.success) {
    throw new Error(response.error || 'Failed to create resource');
  }
  return response.data;
}

export async function getResource(
  tenantId: string,
  id: string
): Promise<ResourceConfig> {
  const api = new TractStackAPI(tenantId);
  const response = await api.get(`/api/v1/nodes/resources/${id}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to get resource');
  }
  return response.data;
}

export async function getResourceBySlug(
  tenantId: string,
  slug: string
): Promise<ResourceConfig> {
  const api = new TractStackAPI(tenantId);
  const response = await api.get(`/api/v1/nodes/resources/slug/${slug}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to get resource by slug');
  }
  return response.data;
}

export async function deleteResource(
  tenantId: string,
  id: string
): Promise<void> {
  const api = new TractStackAPI(tenantId);
  const response = await api.request(`/api/v1/nodes/resources/${id}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete resource');
  }
}

export async function getAllResourceIds(tenantId: string): Promise<string[]> {
  const api = new TractStackAPI(tenantId);
  const response = await api.get<{ count: number; resourceIds: string[] }>(
    '/api/v1/nodes/resources'
  );
  if (!response.success) {
    throw new Error(response.error || 'Failed to get resource IDs');
  }
  return response.data?.resourceIds || [];
}

export async function getResourcesByIds(
  tenantId: string,
  ids: string[]
): Promise<ResourceConfig[]> {
  const api = new TractStackAPI(tenantId);
  const response = await api.post<{ resources: ResourceConfig[] }>(
    '/api/v1/nodes/resources',
    { resourceIds: ids }
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to get resources by IDs');
  }
  return response.data.resources;
}

export async function getResourcesByCategory(
  tenantId: string,
  categorySlug: string
): Promise<ResourceConfig[]> {
  const allIds = await getAllResourceIds(tenantId);
  if (!allIds || allIds.length === 0) {
    return [];
  }
  const allResources = await getResourcesByIds(tenantId, allIds);
  return allResources.filter(
    (resource) => resource.categorySlug === categorySlug
  );
}

export async function saveResourceWithStateUpdate(
  tenantId: string,
  currentState: ResourceState
): Promise<ResourceState> {
  // Convert to backend format
  const backendFormat = convertToBackendFormat(currentState);

  // Determine if this is a create operation
  const isCreate = !currentState.id || currentState.id === '';

  if (isCreate) {
    // For create, remove id and call createResource
    const { id, ...createData } = backendFormat;
    const createdResource = await createResource(tenantId, createData);
    return convertToLocalState(createdResource);
  } else {
    // For update, send the FULL payload (not just changed fields)
    // This is required for nodes unlike brand/advanced config
    const updatedResource = await saveResource(tenantId, backendFormat);
    return convertToLocalState(updatedResource);
  }
}

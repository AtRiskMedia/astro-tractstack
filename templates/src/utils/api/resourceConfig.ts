import { TractStackAPI } from '../api';
import { convertToLocalState, convertToBackendFormat } from './resourceHelpers';
import type { ResourceConfig, ResourceState } from '@/types/tractstack';

const api = new TractStackAPI();

/**
 * Save resource - handles both create and update operations
 */
export async function saveResource(
  resource: Partial<ResourceConfig> & { ID?: string }
): Promise<ResourceConfig> {
  try {
    const isCreate = !resource.ID || resource.ID === '';

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
        `/api/v1/nodes/resources/${resource.ID}`,
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
  resource: Omit<ResourceConfig, 'ID'>
): Promise<ResourceConfig> {
  const response = await api.post('/api/v1/nodes/resources/create', resource);
  if (!response.success) {
    throw new Error(response.error || 'Failed to create resource');
  }
  return response.data;
}

export async function getResource(id: string): Promise<ResourceConfig> {
  const response = await api.get(`/api/v1/nodes/resources/${id}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to get resource');
  }
  return response.data;
}

export async function getResourceBySlug(slug: string): Promise<ResourceConfig> {
  const response = await api.get(`/api/v1/nodes/resources/slug/${slug}`);
  if (!response.success) {
    throw new Error(response.error || 'Failed to get resource by slug');
  }
  return response.data;
}

export async function deleteResource(id: string): Promise<void> {
  const response = await api.request(`/api/v1/nodes/resources/${id}`, {
    method: 'DELETE',
  });
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete resource');
  }
}

export async function getAllResourceIds(): Promise<string[]> {
  const response = await api.get('/api/v1/nodes/resources');
  if (!response.success) {
    throw new Error(response.error || 'Failed to get resource IDs');
  }
  return response.data;
}

export async function getResourcesByIds(
  ids: string[]
): Promise<ResourceConfig[]> {
  const response = await api.post('/api/v1/nodes/resources', { ids });
  if (!response.success) {
    throw new Error(response.error || 'Failed to get resources by IDs');
  }
  return response.data;
}

export async function getResourcesByCategory(
  categorySlug: string
): Promise<ResourceConfig[]> {
  const allIds = await getAllResourceIds();
  const allResources = await getResourcesByIds(allIds);
  return allResources.filter(
    (resource) => resource.CATEGORY_SLUG === categorySlug
  );
}

export async function saveResourceWithStateUpdate(
  currentState: ResourceState,
  originalState: ResourceState
): Promise<ResourceState> {
  // Convert to backend format
  const backendFormat = convertToBackendFormat(currentState);

  // Determine if this is a create operation
  const isCreate = !currentState.id || currentState.id === '';

  if (isCreate) {
    // For create, remove ID and call createResource
    const { ID, ...createData } = backendFormat;
    const createdResource = await createResource(createData);
    return convertToLocalState(createdResource);
  } else {
    // For update, calculate changed fields
    const originalBackendFormat = convertToBackendFormat(originalState);
    const changedFields: Partial<ResourceConfig> = { ID: backendFormat.ID };

    // Compare each field and include only changed ones
    Object.keys(backendFormat).forEach((key) => {
      const typedKey = key as keyof ResourceConfig;
      if (backendFormat[typedKey] !== originalBackendFormat[typedKey]) {
        (changedFields as any)[typedKey] = backendFormat[typedKey];
      }
    });

    // If only ID is in changedFields, nothing actually changed
    if (Object.keys(changedFields).length <= 1) {
      return currentState;
    }

    // Save the changes
    const updatedResource = await saveResource(changedFields);
    return convertToLocalState(updatedResource);
  }
}

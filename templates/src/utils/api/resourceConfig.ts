import { TractStackAPI } from '../api';
import type { ResourceConfig, ResourceState } from '../../types/tractstack';
import {
  convertToLocalState,
  convertToBackendFormat,
} from '../resourceHelpers';

const api = new TractStackAPI();

export async function saveResource(
  resource: Partial<ResourceConfig>
): Promise<ResourceConfig> {
  const response = await api.put(
    `/api/v1/nodes/resources/${resource.ID}`,
    resource
  );
  if (!response.success) {
    throw new Error(response.error || 'Failed to save resource');
  }
  return response.data;
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
  originalState: ResourceState,
  isCreate: boolean = false
): Promise<ResourceState> {
  const backendFormat = convertToBackendFormat(currentState);

  if (isCreate) {
    const { ID, ...createData } = backendFormat;
    const createdResource = await createResource(createData);
    return convertToLocalState(createdResource);
  } else {
    const originalBackendFormat = convertToBackendFormat(originalState);
    const changedFields: Partial<ResourceConfig> = { ID: backendFormat.ID };

    Object.keys(backendFormat).forEach((key) => {
      const typedKey = key as keyof ResourceConfig;
      if (backendFormat[typedKey] !== originalBackendFormat[typedKey]) {
        (changedFields as any)[typedKey] = backendFormat[typedKey];
      }
    });

    if (Object.keys(changedFields).length <= 1) {
      return currentState;
    }

    const updatedResource = await saveResource(changedFields);
    return convertToLocalState(updatedResource);
  }
}

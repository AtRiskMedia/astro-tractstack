import { TractStackAPI } from '../api';
import type { BeliefNode, BeliefNodeState } from '../../types/tractstack';
import { convertToBackendFormat, convertToLocalState } from '../beliefHelpers';

/**
 * Save an existing belief
 */
export async function saveBelief(
  beliefState: BeliefNodeState
): Promise<BeliefNode> {
  const api = new TractStackAPI();
  const beliefData = convertToBackendFormat(beliefState);

  const response = await api.put(
    `/api/v1/nodes/beliefs/${beliefState.id}`,
    beliefData
  );
  return response.data as BeliefNode;
}

/**
 * Create a new belief
 */
export async function createBelief(
  beliefState: BeliefNodeState
): Promise<BeliefNode> {
  const api = new TractStackAPI();
  const beliefData = convertToBackendFormat(beliefState);

  const response = await api.post('/api/v1/nodes/beliefs/create', beliefData);
  return response.data as BeliefNode;
}

/**
 * Delete a belief
 */
export async function deleteBelief(beliefId: string): Promise<void> {
  const api = new TractStackAPI();
  await api.request(`/api/v1/nodes/beliefs/${beliefId}`, { method: 'DELETE' });
}

/**
 * Get a belief by ID
 */
export async function getBeliefById(beliefId: string): Promise<BeliefNode> {
  const api = new TractStackAPI();
  const response = await api.get(`/api/v1/nodes/beliefs/${beliefId}`);
  return response.data as BeliefNode;
}

/**
 * Main save workflow with state update
 * Following the exact pattern from menuConfig.ts
 */
export async function saveBeliefWithStateUpdate(
  currentState: BeliefNodeState,
  originalState: BeliefNodeState
): Promise<BeliefNodeState> {
  try {
    let savedBelief: BeliefNode;

    // Determine if this is a create or update operation
    const isCreate = !currentState.id || currentState.id === '';

    if (isCreate) {
      // Generate temporary ID for create (backend will assign real ID)
      const tempState = { ...currentState, id: crypto.randomUUID() };
      savedBelief = await createBelief(tempState);
    } else {
      savedBelief = await saveBelief(currentState);
    }

    // Convert the saved belief back to state format
    return convertToLocalState(savedBelief);
  } catch (error) {
    console.error('Belief save failed:', error);
    throw error;
  }
}

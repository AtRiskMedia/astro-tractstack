import type {
  BeliefNode,
  BeliefNodeState,
  FieldErrors,
} from '@/types/tractstack';

/**
 * Convert backend BeliefNode to frontend BeliefNodeState
 */
export function convertToLocalState(beliefNode: BeliefNode): BeliefNodeState {
  return {
    id: beliefNode.id,
    title: beliefNode.title,
    slug: beliefNode.slug,
    scale: beliefNode.scale,
    customValues: beliefNode.customValues || [],
  };
}

/**
 * Convert frontend BeliefNodeState to backend BeliefNode format
 */
export function convertToBackendFormat(state: BeliefNodeState): BeliefNode {
  return {
    id: state.id,
    title: state.title,
    slug: state.slug,
    scale: state.scale,
    customValues:
      state.customValues.length > 0 ? state.customValues : undefined,
  };
}

/**
 * Validate belief node state
 */
export function validateBeliefNode(state: BeliefNodeState): FieldErrors {
  const errors: FieldErrors = {};

  // Validate title
  if (!state.title?.trim()) {
    errors.title = 'Title is required';
  }

  // Validate slug
  if (!state.slug?.trim()) {
    errors.slug = 'Slug is required';
  }

  // Validate scale
  if (!state.scale?.trim()) {
    errors.scale = 'Scale is required';
  }

  // Validate custom values if scale is custom
  if (state.scale === 'custom') {
    if (!state.customValues || state.customValues.length === 0) {
      errors.customValues =
        'At least one custom value is required for custom scale';
    } else {
      state.customValues.forEach((value, index) => {
        if (!value?.trim()) {
          errors[`customValues.${index}`] = 'Custom value cannot be empty';
        }
      });
    }
  }

  return errors;
}

/**
 * State interceptor for form state management
 */
export function beliefStateIntercept(
  state: BeliefNodeState,
  field: keyof BeliefNodeState,
  value: any
): BeliefNodeState {
  const newState = { ...state };

  switch (field) {
    case 'title':
      newState.title = value || '';
      break;
    case 'slug':
      newState.slug = value || '';
      break;
    case 'scale':
      newState.scale = value || '';
      // Clear custom values when scale changes away from custom
      if (value !== 'custom') {
        newState.customValues = [];
      }
      break;
    case 'customValues':
      newState.customValues = value || [];
      break;
    default:
      (newState as any)[field] = value;
  }

  return newState;
}

/**
 * Add a new custom value to the state
 */
export function addCustomValue(
  state: BeliefNodeState,
  value: string
): BeliefNodeState {
  if (!value.trim()) return state;

  return {
    ...state,
    customValues: [...state.customValues, value.trim()],
  };
}

/**
 * Remove a custom value from the state
 */
export function removeCustomValue(
  state: BeliefNodeState,
  index: number
): BeliefNodeState {
  return {
    ...state,
    customValues: state.customValues.filter((_, i) => i !== index),
  };
}

/**
 * Update a specific custom value in the state
 */
export function updateCustomValue(
  state: BeliefNodeState,
  index: number,
  value: string
): BeliefNodeState {
  const newCustomValues = [...state.customValues];
  newCustomValues[index] = value;

  return {
    ...state,
    customValues: newCustomValues,
  };
}

/**
 * Scale options for the belief form
 */
export const SCALE_OPTIONS = [
  { value: 'likert', label: 'Likert Scale (1-5)' },
  { value: 'agreement', label: 'Agreement (Agree/Disagree)' },
  { value: 'interest', label: 'Interest (Interested/Not Interested)' },
  { value: 'yn', label: 'Yes/No' },
  { value: 'tf', label: 'True/False' },
  { value: 'custom', label: 'Custom Values' },
];

/**
 * Get scale preview data for displaying scale options
 */
export function getScalePreview(scale: string) {
  const scalePreviewData: {
    [key: string]: Array<{ id: number; name: string; color: string }>;
  } = {
    likert: [
      { id: 1, name: 'Strongly agree', color: 'bg-teal-400' },
      { id: 2, name: 'Agree', color: 'bg-lime-400' },
      { id: 3, name: 'Neither agree nor disagree', color: 'bg-slate-200' },
      { id: 4, name: 'Disagree', color: 'bg-amber-400' },
      { id: 5, name: 'Strongly disagree', color: 'bg-red-400' },
    ],
    agreement: [
      { id: 1, name: 'Agree', color: 'bg-lime-400' },
      { id: 2, name: 'Disagree', color: 'bg-amber-400' },
    ],
    interest: [
      { id: 1, name: 'Interested', color: 'bg-lime-400' },
      { id: 2, name: 'Not Interested', color: 'bg-amber-400' },
    ],
    yn: [
      { id: 1, name: 'Yes', color: 'bg-lime-400' },
      { id: 2, name: 'No', color: 'bg-amber-400' },
    ],
    tf: [
      { id: 1, name: 'True', color: 'bg-lime-400' },
      { id: 2, name: 'False', color: 'bg-amber-400' },
    ],
  };

  return scalePreviewData[scale] || null;
}

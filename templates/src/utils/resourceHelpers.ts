import type {
  ResourceConfig,
  ResourceState,
  FieldErrors,
} from '../types/tractstack';

export function convertToLocalState(backend: ResourceConfig): ResourceState {
  let parsedOptionsPayload: Record<string, any> = {};

  if (backend.OPTIONS_PAYLOAD) {
    try {
      parsedOptionsPayload =
        typeof backend.OPTIONS_PAYLOAD === 'string'
          ? JSON.parse(backend.OPTIONS_PAYLOAD)
          : backend.OPTIONS_PAYLOAD;
    } catch (error) {
      console.warn('Failed to parse OPTIONS_PAYLOAD:', error);
      parsedOptionsPayload = {};
    }
  }

  return {
    id: backend.ID || '',
    title: backend.TITLE || '',
    slug: backend.SLUG || '',
    categorySlug: backend.CATEGORY_SLUG || '',
    oneliner: backend.ONELINER || '',
    optionsPayload: parsedOptionsPayload,
    actionLisp: backend.ACTION_LISP || undefined,
  };
}

export function convertToBackendFormat(local: ResourceState): any {
  return {
    id: local.id,
    title: local.title,
    slug: local.slug,
    categorySlug: local.categorySlug,
    oneliner: local.oneliner,
    optionsPayload: local.optionsPayload || {},
    actionLisp: local.actionLisp || undefined,
  };
}

export function validateResource(state: ResourceState): FieldErrors {
  const errors: FieldErrors = {};

  if (!state.title?.trim()) {
    errors.title = 'Title is required';
  }

  if (!state.slug?.trim()) {
    errors.slug = 'Slug is required';
  } else if (!/^[a-z0-9-]+$/.test(state.slug)) {
    errors.slug =
      'Slug must contain only lowercase letters, numbers, and hyphens';
  }

  if (!state.categorySlug?.trim()) {
    errors.categorySlug = 'Category is required';
  }

  return errors;
}

export function resourceStateIntercept(
  updatedState: ResourceState,
  fieldName: string,
  value: any
): ResourceState {
  const newState = { ...updatedState };

  if (fieldName === 'title' || fieldName === 'categorySlug') {
    if (newState.title && newState.categorySlug) {
      const titleSlug = newState.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      newState.slug = `${newState.categorySlug}-${titleSlug}`;
    }
  }

  return newState;
}

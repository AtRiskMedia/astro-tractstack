import type { MenuNode, MenuNodeState, FieldErrors } from '@/types/tractstack';

/**
 * Convert backend MenuNode to frontend MenuNodeState
 */
export function convertToLocalState(menuNode: MenuNode): MenuNodeState {
  return {
    id: menuNode.id,
    title: menuNode.title,
    theme: menuNode.theme,
    menuLinks: menuNode.optionsPayload.map((link) => ({
      name: link.name,
      description: link.description,
      featured: link.featured,
      actionLisp: link.actionLisp,
    })),
  };
}

/**
 * Convert frontend MenuNodeState to backend MenuNode format
 */
export function convertToBackendFormat(state: MenuNodeState): MenuNode {
  return {
    id: state.id,
    title: state.title,
    theme: state.theme,
    optionsPayload: state.menuLinks.map((link) => ({
      name: link.name,
      description: link.description,
      featured: link.featured,
      actionLisp: link.actionLisp,
    })),
  };
}

/**
 * Validate menu node state
 */
export function validateMenuNode(state: MenuNodeState): FieldErrors {
  const errors: FieldErrors = {};

  // Validate title
  if (!state.title?.trim()) {
    errors.title = 'Title is required';
  }

  // Validate theme
  if (!state.theme?.trim()) {
    errors.theme = 'Theme is required';
  }

  // Validate menu links
  if (!state.menuLinks || state.menuLinks.length === 0) {
    errors.menuLinks = 'At least one menu link is required';
  } else {
    state.menuLinks.forEach((link, index) => {
      if (!link.name?.trim()) {
        errors[`menuLinks.${index}.name`] = 'Link name is required';
      }
      if (!link.actionLisp?.trim()) {
        errors[`menuLinks.${index}.actionLisp`] = 'Action is required';
      } else {
        // Basic ActionLisp validation
        if (!link.actionLisp.startsWith('(goto ')) {
          errors[`menuLinks.${index}.actionLisp`] =
            'Action must start with "(goto "';
        }
        if (!link.actionLisp.endsWith('))')) {
          errors[`menuLinks.${index}.actionLisp`] = 'Action must end with "))"';
        }
      }
    });
  }

  return errors;
}

/**
 * State interceptor for form state management
 */
export function menuStateIntercept(
  state: MenuNodeState,
  field: keyof MenuNodeState,
  value: any
): MenuNodeState {
  const newState = { ...state };

  switch (field) {
    case 'title':
      newState.title = value || '';
      break;
    case 'theme':
      newState.theme = value || '';
      break;
    case 'menuLinks':
      newState.menuLinks = value || [];
      break;
    default:
      (newState as any)[field] = value;
  }

  return newState;
}

/**
 * Add a new menu link to the state
 */
export function addMenuLink(state: MenuNodeState): MenuNodeState {
  return {
    ...state,
    menuLinks: [
      ...state.menuLinks,
      {
        name: '',
        description: '',
        featured: true,
        actionLisp: '',
      },
    ],
  };
}

/**
 * Remove a menu link from the state
 */
export function removeMenuLink(
  state: MenuNodeState,
  index: number
): MenuNodeState {
  return {
    ...state,
    menuLinks: state.menuLinks.filter((_, i) => i !== index),
  };
}

/**
 * Update a specific menu link in the state
 */
export function updateMenuLink(
  state: MenuNodeState,
  index: number,
  field: string,
  value: any
): MenuNodeState {
  const newMenuLinks = [...state.menuLinks];
  newMenuLinks[index] = {
    ...newMenuLinks[index],
    [field]: value,
  };

  return {
    ...state,
    menuLinks: newMenuLinks,
  };
}

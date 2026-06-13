import type { ResourceNode } from '@/types/compositorTypes';
import type { CartItemState } from '@/stores/shopify';

export type AppointmentMode = 'IN_PERSON' | 'REMOTE';

export type AppointmentSchedulingInput = {
  allowRemote?: boolean;
  remoteOnly?: boolean;
};

export type AppointmentModeConstraints = {
  serviceResources: ResourceNode[];
  anyServiceRemoteOnly: boolean;
  someServiceForcesInPerson: boolean;
  allServicesAllowRemote: boolean;
  effectiveRemoteOnly: boolean;
  effectiveAllowRemote: boolean;
  remoteAvailable: boolean;
  inPersonAvailable: boolean;
  hasImpossibleRemoteMix: boolean;
  /** Same as `remoteAvailable`; kept for cart naming parity */
  canRemote: boolean;
};

/**
 * Collects service resources involved in booking (same rules as Cart / CheckoutModal).
 */
export function collectBookingServiceResources(
  cart: Record<string, CartItemState>,
  resources: ResourceNode[]
): ResourceNode[] {
  const dedupe = new Map<string, ResourceNode>();
  for (const item of Object.values(cart)) {
    const resource = resources.find((r) => r.id === item.resourceId);
    if (
      resource &&
      (resource.categorySlug === 'service' ||
        resource.optionsPayload?.bookingLengthMinutes)
    ) {
      dedupe.set(resource.id, resource);
    }
    if (item.boundResourceId) {
      const bound = resources.find((r) => r.id === item.boundResourceId);
      if (bound) {
        dedupe.set(bound.id, bound);
      }
    }
  }
  return Array.from(dedupe.values());
}

/**
 * Returns true if the cart would mix remote-only services with in-person-only services.
 */
export function wouldCartHaveImpossibleRemoteMix(
  nextCart: Record<string, CartItemState>,
  resources: ResourceNode[]
): boolean {
  const svc = collectBookingServiceResources(nextCart, resources);
  const anyRemoteOnly = svc.some((r) => Boolean(r.optionsPayload?.remoteOnly));
  const someInPersonOnly = svc.some(
    (r) =>
      !Boolean(r.optionsPayload?.remoteOnly) &&
      !Boolean(r.optionsPayload?.allowRemote)
  );
  return anyRemoteOnly && someInPersonOnly;
}

/**
 * Single source of truth for tenant + per-service remote eligibility.
 */
export function deriveAppointmentConstraints(
  cart: Record<string, CartItemState>,
  resources: ResourceNode[],
  tenantScheduling: AppointmentSchedulingInput
): AppointmentModeConstraints {
  const serviceResources = collectBookingServiceResources(cart, resources);
  const allowRemote = Boolean(tenantScheduling.allowRemote);
  const tenantRemoteOnly = Boolean(tenantScheduling.remoteOnly);

  const anyServiceRemoteOnly = serviceResources.some((r) =>
    Boolean(r.optionsPayload?.remoteOnly)
  );
  const someServiceForcesInPerson = serviceResources.some(
    (r) =>
      !Boolean(r.optionsPayload?.remoteOnly) &&
      !Boolean(r.optionsPayload?.allowRemote)
  );
  const allServicesAllowRemote =
    serviceResources.length === 0 ||
    serviceResources.every(
      (r) =>
        Boolean(r.optionsPayload?.remoteOnly) ||
        Boolean(r.optionsPayload?.allowRemote)
    );

  const effectiveRemoteOnly = tenantRemoteOnly || anyServiceRemoteOnly;
  const effectiveAllowRemote = allowRemote || tenantRemoteOnly;

  const remoteAvailable =
    effectiveRemoteOnly ||
    (effectiveAllowRemote &&
      serviceResources.length > 0 &&
      allServicesAllowRemote);

  const inPersonAvailable = !effectiveRemoteOnly;
  const hasImpossibleRemoteMix =
    anyServiceRemoteOnly && someServiceForcesInPerson;

  return {
    serviceResources,
    anyServiceRemoteOnly,
    someServiceForcesInPerson,
    allServicesAllowRemote,
    effectiveRemoteOnly,
    effectiveAllowRemote,
    remoteAvailable,
    inPersonAvailable,
    hasImpossibleRemoteMix,
    canRemote: remoteAvailable,
  };
}

export function pickInitialAppointmentMode(
  c: AppointmentModeConstraints,
  currentPreferred: AppointmentMode
): AppointmentMode {
  if (c.effectiveRemoteOnly) {
    return 'REMOTE';
  }
  if (currentPreferred === 'REMOTE' && c.remoteAvailable) {
    return 'REMOTE';
  }
  return 'IN_PERSON';
}

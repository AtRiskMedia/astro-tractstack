export const RESTRICTION_MESSAGES = {
  BOOKING: (duration: number) =>
    `This is a ${duration} minute service. On checkout we'll help you book at your convenience.`,
  TERMS: 'Please review the terms for this item before adding it to your cart.',
  MAX_DURATION: (max: number) =>
    `You cannot book more than ${max} minutes of services in one session.`,
  INCOMPATIBLE_REMOTE:
    'This service cannot be combined with the services already in your cart. Some require remote-only delivery while others can only be delivered in person.',
  DEFAULT_ADD: (title: string) => `${title} has been added to your cart.`,
};

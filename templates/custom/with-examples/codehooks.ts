// Static, hand-maintained per-install manifest of available codehook ids.
// The backend never sees this; it is a frontend build capability list only.
// To add/remove a hook, edit this array AND add/remove the matching blade at
// src/pages/codehooks/{id}.astro. Not regenerated automatically.
export const availableCodeHookIds: string[] = [
  'featured-article',
  'list-content',
  'search-widget',
  'bunny-video',
  'epinet',
  'shopify-product-grid',
  'shopify-service-list',
  'custom-hero',
  'get-crafting',
];

// URL Helper: Strip category prefix from slug
// e.g., "people-bleako" -> "bleako"
export function getCleanSlug(categorySlug: string, fullSlug: string): string {
  const prefix = `${categorySlug}-`;
  return fullSlug.startsWith(prefix) ? fullSlug.slice(prefix.length) : fullSlug;
}

// Build proper URL for resource
// e.g., category="people", slug="people-bleako" -> "/people/bleako"
export function getResourceUrl(categorySlug: string, fullSlug: string): string {
  const cleanSlug = getCleanSlug(categorySlug, fullSlug);
  return `/${categorySlug}/${cleanSlug}`;
}

// Image Helper: Placeholder implementation
export function getResourceImage(
  id: string,
  slug: string,
  category: string
): string {
  console.log(`please define getResourceImage`, id, slug, category);
  return '/static.jpg';
}

export function getResourceDescription(
  id: string,
  slug: string,
  category: string
): string | null {
  console.log(`please define getResourceDescription`, id, slug, category);
  return null;
}

// Initialize search data - override in custom implementation
export function initSearch(): void {
  // Default implementation does nothing
  // Override this function in your custom implementation to load search data
}

// Core TractStack configuration
export interface TractStackConfig {
  /** HTMX configuration */
  htmx?: HTMXConfig;
}

export interface HTMXConfig {
  /** HTMX version to use */
  version?: string;

  /** Additional HTMX extensions to load */
  extensions?: string[];
}

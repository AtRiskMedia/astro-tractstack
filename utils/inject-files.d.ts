import type { AstroIntegrationLogger } from '@/types/astro';
interface InjectFilesConfig {
    includeExamples?: boolean;
    enableMultiTenant?: boolean;
}
/**
 * Injects template files into the project directory, organizing them into functional groups.
 * Skips or overwrites files based on configuration and protection status.
 * @param resolve - Function to resolve template file paths
 * @param logger - Astro integration logger for logging operations
 * @param config - Configuration options for including examples and enabling multi-tenant features
 */
export declare function injectTemplateFiles(resolve: (path: string) => string, logger: AstroIntegrationLogger, config?: InjectFilesConfig): Promise<void>;
export {};

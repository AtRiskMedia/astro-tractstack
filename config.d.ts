import type { TractStackConfig } from '@/types/astro';
export interface AuthConfig {
    sessionTimeout?: number;
    enableAutoSession?: boolean;
    enableSSE?: boolean;
    cookiePath?: string;
    cookieSecure?: boolean;
    cookieSameSite?: 'strict' | 'lax' | 'none';
    enableFastPass?: boolean;
    fastPassStorageKey?: string;
    requireConsent?: boolean;
    consentTimeout?: number;
    enableDebugMode?: boolean;
    logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}
export interface TractStackConfigWithAuth extends TractStackConfig {
    auth?: AuthConfig;
}
export interface TractStackConfigComplete extends TractStackConfig {
    auth: Required<AuthConfig>;
}
export declare function defineConfig(config?: TractStackConfigWithAuth): TractStackConfigComplete;
export declare function validateAuthConfig(config: AuthConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
};
export declare function getEnvironmentConfig(): {
    backendUrl: string;
    tenantId: string;
    isValid: boolean;
    errors: string[];
};
export declare function getClientConfig(config: TractStackConfigWithAuth): {
    backendUrl: string;
    tenantId: string;
    auth: Required<AuthConfig>;
    version: string;
};
export type { TractStackConfigWithAuth as TractStackConfigExport, AuthConfig as AuthConfigExport, };

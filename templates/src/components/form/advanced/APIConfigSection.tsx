import StringInput from '../StringInput';
import type { FormStateReturn } from '@/hooks/useFormState';
import type {
  AdvancedConfigState,
  AdvancedConfigStatus,
} from '@/types/tractstack';

interface APIConfigSectionProps {
  formState: FormStateReturn<AdvancedConfigState>;
  status: AdvancedConfigStatus | null;
}

export default function APIConfigSection({
  formState,
  status,
}: APIConfigSectionProps) {
  const { state, updateField, errors } = formState;

  // Status flags
  const aaiConfigured = status?.aaiAPIKeySet;
  const shopifyStorefrontConfigured = status?.shopifyStorefrontTokenSet;
  const shopifySecretConfigured = status?.shopifyApiSecretSet;
  const shopifyDomainConfigured = status?.shopifyStoreDomainSet;
  const resendConfigured = status?.resendApiKeySet;

  const renderStatusBadge = (isConfigured: boolean | undefined) => {
    if (status === null) {
      return (
        <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">
          Loading...
        </span>
      );
    }
    return isConfigured ? (
      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">
        ✓ Set
      </span>
    ) : (
      <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">
        Not Set
      </span>
    );
  };

  return (
    <div className="bg-white shadow md:rounded-lg">
      <div className="px-4 py-5 md:p-6">
        <h3 className="text-base font-bold leading-6 text-gray-900">
          API Integrations
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Configure external services to enable advanced features like AI,
            Commerce, and Email.
          </p>
        </div>

        <div className="mt-6 space-y-8">
          {/* AssemblyAI Section */}
          <div className="border-t border-gray-100 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">
                AssemblyAI (Audio Intelligence)
              </h4>
              {renderStatusBadge(aaiConfigured)}
            </div>
            <StringInput
              label="API Key"
              value={state.aaiApiKey}
              onChange={(value) => updateField('aaiApiKey', value)}
              type="password"
              placeholder={
                aaiConfigured ? '••••••••••••••••' : 'Enter AssemblyAI API key'
              }
              error={errors.aaiApiKey}
            />
            <p className="mt-2 text-xs text-gray-500">
              Required for audio transcription and analysis.
              {aaiConfigured && ' Leave blank to keep existing key.'}
            </p>
          </div>

          {/* Shopify Section */}
          <div className="border-t border-gray-100 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">
                Shopify (Commerce)
              </h4>
              {renderStatusBadge(
                shopifyStorefrontConfigured &&
                  shopifySecretConfigured &&
                  shopifyDomainConfigured
              )}
            </div>
            <div className="space-y-4">
              <div>
                <StringInput
                  label="Shopify Store Domain"
                  value={state.shopifyStoreDomain}
                  onChange={(value) => updateField('shopifyStoreDomain', value)}
                  placeholder={
                    shopifyDomainConfigured
                      ? 'your-shop.myshopify.com'
                      : 'your-shop.myshopify.com'
                  }
                  error={errors.shopifyStoreDomain}
                />
                <p className="mt-1 text-xs text-gray-500">
                  The primary .myshopify.com domain for your store.
                </p>
              </div>

              <div>
                <StringInput
                  label="Headless channel, Private Access Token"
                  value={state.shopifyStorefrontToken}
                  onChange={(value) =>
                    updateField('shopifyStorefrontToken', value)
                  }
                  type="password"
                  placeholder={
                    shopifyStorefrontConfigured
                      ? '••••••••••••••••'
                      : 'shpat_...'
                  }
                  error={errors.shopifyStorefrontToken}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Private access token for fetching products.
                  {shopifyStorefrontConfigured &&
                    ' Leave blank to keep existing.'}
                </p>
              </div>

              <div>
                <StringInput
                  label="API Secret Key"
                  value={state.shopifyApiSecret}
                  onChange={(value) => updateField('shopifyApiSecret', value)}
                  type="password"
                  placeholder={
                    shopifySecretConfigured ? '••••••••••••••••' : 'shpss_...'
                  }
                  error={errors.shopifyApiSecret}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Required for Webhook signature verification.
                  {shopifySecretConfigured && ' Leave blank to keep existing.'}
                </p>
              </div>
            </div>
          </div>

          {/* Resend Section */}
          <div className="border-t border-gray-100 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">
                Resend (Transactional Email)
              </h4>
              {renderStatusBadge(resendConfigured)}
            </div>
            <StringInput
              label="API Key"
              value={state.resendApiKey}
              onChange={(value) => updateField('resendApiKey', value)}
              type="password"
              placeholder={resendConfigured ? '••••••••••••••••' : 're_...'}
              error={errors.resendApiKey}
            />
            <p className="mt-2 text-xs text-gray-500">
              Required for sending system emails.
              {resendConfigured && ' Leave blank to keep existing key.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Dialog, Portal } from '@ark-ui/react';
import StringInput from '../StringInput';
import BooleanToggle from '../BooleanToggle';
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  // Status flags
  const aaiConfigured = status?.aaiAPIKeySet;
  const shopifyStorefrontConfigured = status?.shopifyStorefrontTokenSet;
  const shopifySecretConfigured = status?.shopifyApiSecretSet;
  const shopifyDomainConfigured = status?.shopifyStoreDomainSet;
  const shopifyVersionConfigured = Boolean(status?.shopifyApiVersion);
  const shopifyAdminSlugConfigured = status?.shopifyAdminSlugSet;
  const shopifyWebhooksConfigured = status?.userSetupWebhooks;
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
                  shopifyDomainConfigured &&
                  shopifyVersionConfigured &&
                  shopifyAdminSlugConfigured &&
                  shopifyWebhooksConfigured
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
                  label="Shopify Admin Slug"
                  value={state.shopifyAdminSlug}
                  onChange={(value) => updateField('shopifyAdminSlug', value)}
                  placeholder="your-store-slug"
                  error={errors.shopifyAdminSlug}
                />
                <p className="mt-1 text-xs text-gray-500">
                  The internal Shopify slug (found in
                  admin.shopify.com/store/SLUG).
                </p>
              </div>

              <div>
                <StringInput
                  label="API Version"
                  value={state.shopifyApiVersion}
                  onChange={(value) => updateField('shopifyApiVersion', value)}
                  type="text"
                  placeholder="2026-01"
                  error={errors.shopifyApiVersion}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Target specific Shopify API version (YYYY-MM).
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

              {!shopifyWebhooksConfigured && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4">
                    <h5 className="text-sm font-bold text-amber-800">
                      Webhook Configuration Required
                    </h5>
                    <p className="mb-3 mt-1 text-xs text-amber-700">
                      To ensure synchronization between Shopify and the
                      TractStack native booking system, you must configure
                      webhook subscriptions within your Shopify Admin panel.
                    </p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="text-xs font-bold text-amber-900 underline hover:text-amber-700"
                      type="button"
                    >
                      [ Detailed Instructions ]
                    </button>
                  </div>

                  <BooleanToggle
                    label="Webhooks Manually Configured"
                    description="I have manually created the required webhooks (orders/paid, products/*) in my Shopify Admin."
                    value={state.userSetupWebhooks}
                    onChange={(value) =>
                      updateField('userSetupWebhooks', value)
                    }
                  />
                </div>
              )}
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

      <Dialog.Root
        open={isModalOpen}
        onOpenChange={(details) => setIsModalOpen(details.open)}
        preventScroll={true}
        lazyMount
        unmountOnExit
      >
        <Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black bg-opacity-75" />
          <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content
              className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
              style={{ maxHeight: '90vh' }}
            >
              {/* Header - Fixed height */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  How to Configure Webhooks in Shopify
                </Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    type="button"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </Dialog.CloseTrigger>
              </div>

              {/* Body - Scrollable via flex-1 */}
              <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-700">
                <ol className="mb-6 list-decimal space-y-2 pl-5">
                  <li>Log in to your Shopify Admin dashboard.</li>
                  <li>
                    Click on <strong>Settings</strong> (the gear icon) in the
                    bottom left corner.
                  </li>
                  <li>
                    In the left sidebar, select <strong>Notifications</strong>.
                  </li>
                  <li>
                    Scroll all the way to the bottom to the{' '}
                    <strong>Webhooks</strong> section.
                  </li>
                  <li>
                    Click the <strong>Create webhook</strong> button.
                  </li>
                  <li>
                    For each required webhook (listed below), configure the
                    following settings:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>
                        <strong>Event:</strong> Select the specific event (e.g.,
                        Order payment, Product creation).
                      </li>
                      <li>
                        <strong>Format:</strong> Select JSON (TractStack relies
                        on JSON unmarshaling).
                      </li>
                      <li>
                        <strong>URL:</strong> Enter your backend webhook URL:{' '}
                        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                          {goBackend}/api/webhooks/shopify
                        </code>
                      </li>
                      <li>
                        <strong>Webhook API version:</strong> Select the version
                        that matches your ShopifyAPIVersion configured in
                        TractStack.
                      </li>
                    </ul>
                  </li>
                  <li>
                    Click <strong>Save</strong>.
                  </li>
                </ol>

                <div className="mb-6 border-l-4 border-red-500 bg-red-50 p-4">
                  <p className="font-bold text-red-800">CRITICAL:</p>
                  <p className="mt-1 text-red-700">
                    After saving your first webhook, Shopify will display a{' '}
                    <strong>Webhook signing secret</strong> at the bottom of the
                    Webhooks section. You must copy this secret and add it to
                    your TractStack API Config as the Shopify API Secret. The
                    backend uses this to verify the HMAC signature of all
                    incoming payloads.
                  </p>
                </div>

                <h4 className="mb-3 text-lg font-bold">
                  Required Webhooks Breakdown
                </h4>
                <p className="mb-4">
                  You must create a separate webhook subscription for each of
                  the following four topics. All of them should point to the
                  exact same URL:{' '}
                  <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                    {goBackend}/api/webhooks/shopify
                  </code>
                </p>

                <div className="space-y-4">
                  <div className="rounded border border-gray-200 bg-gray-50 p-4">
                    <h5 className="font-bold">1. Order Paid</h5>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>
                        <span className="font-bold text-gray-900">
                          Shopify Event Name:
                        </span>{' '}
                        Order payment
                      </li>
                      <li>
                        <span className="font-bold text-gray-900">
                          Topic Header:
                        </span>{' '}
                        orders/paid
                      </li>
                      <li>
                        <span className="font-bold text-gray-900">
                          Purpose:
                        </span>{' '}
                        Transitions the corresponding hold in the bookings
                        database table from PENDING to CONFIRMED.
                      </li>
                    </ul>
                  </div>

                  <div className="rounded border border-gray-200 bg-gray-50 p-4">
                    <h5 className="font-bold">2. Product Creation</h5>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>
                        <span className="font-bold text-gray-900">
                          Shopify Event Name:
                        </span>{' '}
                        Product creation
                      </li>
                      <li>
                        <span className="font-bold text-gray-900">
                          Topic Header:
                        </span>{' '}
                        products/create
                      </li>
                    </ul>
                  </div>

                  <div className="rounded border border-gray-200 bg-gray-50 p-4">
                    <h5 className="font-bold">3. Product Update</h5>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>
                        <span className="font-bold text-gray-900">
                          Shopify Event Name:
                        </span>{' '}
                        Product update
                      </li>
                      <li>
                        <span className="font-bold text-gray-900">
                          Topic Header:
                        </span>{' '}
                        products/update
                      </li>
                    </ul>
                  </div>

                  <div className="rounded border border-gray-200 bg-gray-50 p-4">
                    <h5 className="font-bold">4. Product Deletion</h5>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>
                        <span className="font-bold text-gray-900">
                          Shopify Event Name:
                        </span>{' '}
                        Product deletion
                      </li>
                      <li>
                        <span className="font-bold text-gray-900">
                          Topic Header:
                        </span>{' '}
                        products/delete
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
}

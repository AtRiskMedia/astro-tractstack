import { useStore } from '@nanostores/react';
import { Switch } from '@ark-ui/react/switch';
import { cartStore, addQueue, type CartAction } from '@/stores/shopify';
import {
  getCartItemKey,
  getServiceVariantIdFromCanonicalProduct,
  isSharedFeeService,
} from '@/custom/shopify/shopifyHelpers';
import { classNames } from '@/utils/helpers';
import type { ResourceNode } from '@/types/compositorTypes';

interface Props {
  resources: ResourceNode[];
  options?: {
    params?: {
      options?: string;
    };
  };
}

const HEX_BG_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default function ShopifyServiceList({ resources = [], options }: Props) {
  const cart = useStore(cartStore);

  const products = resources.filter((r) => r.categorySlug === 'product');
  let services = resources.filter((r) => r.categorySlug === 'service');

  let group = '';
  let title = '';
  let bgColor = '#f9f9f9';
  try {
    const parsedOptions = JSON.parse(options?.params?.options || '{}');
    group = typeof parsedOptions.group === 'string' ? parsedOptions.group : '';
    if (typeof parsedOptions.title === 'string') {
      title = parsedOptions.title.trim();
    }
    const rawBg = parsedOptions.bgColor;
    if (typeof rawBg === 'string' && HEX_BG_RE.test(rawBg)) {
      bgColor = rawBg;
    }
  } catch (e) {
    // Ignore JSON parse errors
  }

  if (group) {
    services = services.filter((s) => s.optionsPayload?.group === group);
  }

  const boundServiceSlugs = new Set(
    products
      .map((p) => p.optionsPayload?.serviceBound as string | undefined)
      .filter((s): s is string => !!s)
  );

  const displayServices = services
    .filter((s) => !boundServiceSlugs.has(s.slug))
    .sort((a, b) => a.title.localeCompare(b.title));

  const handleCheckedChange = (resource: ResourceNode, checked: boolean) => {
    const actionType = checked ? 'add' : 'remove';
    const gid =
      typeof resource.optionsPayload?.gid === 'string'
        ? resource.optionsPayload.gid
        : undefined;

    const sharedFee = isSharedFeeService(resource, products);
    const variantId = sharedFee
      ? undefined
      : getServiceVariantIdFromCanonicalProduct(resource, products);

    const newAction: CartAction = {
      resourceId: resource.id,
      gid,
      variantId,
      action: actionType,
    };
    addQueue.set([...addQueue.get(), newAction]);
  };

  if (!displayServices || displayServices.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      <div
        className="flex w-full flex-col p-12 md:p-12 xl:p-16"
        style={{ backgroundColor: bgColor }}
      >
        {title ? (
          <header className="max-w-4xl">
            <h3
              className="mb-6 text-balance font-action text-2xl font-bold md:text-3xl xl:text-4xl"
              style={{ color: '#2d2923' }}
            >
              {title}
            </h3>
          </header>
        ) : null}
        <section className="w-full">
          <div className="space-y-4">
            {displayServices.map((resource) => {
              const key = getCartItemKey(
                { resourceId: resource.id },
                resource,
                products
              );

              const cartItem = cart[key];
              const legacyCartItem = Object.values(cart).find(
                (item) =>
                  item.resourceId === resource.id && (item.quantity || 0) > 0
              );
              const selectedQuantity =
                cartItem?.quantity || legacyCartItem?.quantity || 0;
              const isSelected = selectedQuantity > 0;
              const duration = resource.optionsPayload?.bookingLengthMinutes;

              return (
                <Switch.Root
                  key={resource.id}
                  checked={isSelected}
                  onCheckedChange={(details) =>
                    handleCheckedChange(resource, details.checked)
                  }
                  className="block w-full"
                >
                  <div
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                      isSelected
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <Switch.Label className="min-w-0 flex-grow cursor-pointer">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-gray-900">
                          {resource.title}
                        </h3>
                        {duration ? (
                          <span className="inline-flex items-center rounded-sm bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                            {duration} mins
                          </span>
                        ) : null}
                        {isSelected ? (
                          <span className="inline-flex items-center rounded-sm bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">
                            In Cart
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {resource.oneliner}
                      </p>
                    </Switch.Label>

                    <Switch.Control
                      className={classNames(
                        `relative ml-4 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`,
                        isSelected ? 'bg-brand-5' : 'bg-gray-200'
                      )}
                    >
                      <Switch.Thumb
                        className={classNames(
                          `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`,
                          isSelected ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </Switch.Control>
                    <Switch.HiddenInput />
                  </div>
                </Switch.Root>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

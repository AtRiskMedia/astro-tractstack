import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, addQueue, type CartAction } from '@/stores/shopify';
import { getShopifyImage } from '@/utils/helpers';
import type { ResourceNode } from '@/types/compositorTypes';

interface Props {
  resources: Record<string, ResourceNode[]>;
  options?: {
    params?: {
      options?: string;
    };
  };
}

interface ShopifyOption {
  name: string;
  values: string[];
}

interface ShopifyVariant {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
  compareAtPrice?: { amount: string; currencyCode: string };
  selectedOptions: { name: string; value: string }[];
}

interface ProductCardProps {
  resource: ResourceNode;
  allServices: ResourceNode[];
}

function ProductCard({ resource, allServices }: ProductCardProps) {
  const cart = useStore(cartStore);

  const serviceBoundSlug = resource.optionsPayload?.serviceBound as
    | string
    | undefined;
  const boundServiceResource = serviceBoundSlug
    ? allServices.find((r) => r.slug === serviceBoundSlug)
    : undefined;

  let product: any = {};
  try {
    if (resource.optionsPayload?.shopifyData) {
      product = JSON.parse(resource.optionsPayload.shopifyData);
    }
  } catch (e) {
    console.error('Failed to parse Shopify data', resource.id);
  }

  const options: ShopifyOption[] = product?.options || [];
  const variants: ShopifyVariant[] = product?.variants || [];
  const vendor: string = product?.vendor || '';

  const hasModeOption = options.some((o) => o.name === 'Mode');
  const visibleOptions = options.filter(
    (o) => o.name !== 'Mode' && o.name !== 'Title'
  );

  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    visibleOptions.forEach((opt) => {
      initial[opt.name] = opt.values[0];
    });
    return initial;
  });

  const getVariant = (targetMode: 'Shipped' | 'Pickup' | null) => {
    if (targetMode && !hasModeOption) return undefined;
    const found = variants.find((v) => {
      const optionsMatch = visibleOptions.every((opt) => {
        const variantOpt = v.selectedOptions.find((o) => o.name === opt.name);
        return variantOpt?.value === selections[opt.name];
      });
      if (!optionsMatch) return false;
      if (hasModeOption && targetMode) {
        const modeOpt = v.selectedOptions.find((o) => o.name === 'Mode');
        return modeOpt?.value === targetMode;
      }
      return !(hasModeOption && !targetMode);
    });
    return found;
  };

  const variantShipped = hasModeOption
    ? getVariant('Shipped')
    : getVariant(null);
  const variantPickup = hasModeOption ? getVariant('Pickup') : undefined;

  const currentDisplayVariant = variantShipped || variantPickup || variants[0];
  const price = currentDisplayVariant?.price?.amount;
  const compareAtPrice = currentDisplayVariant?.compareAtPrice?.amount;
  const currency = currentDisplayVariant?.price?.currencyCode || 'USD';

  // High contrast rose badge calculation
  let discountPercent = 0;
  if (price && compareAtPrice) {
    const p = parseFloat(price);
    const cap = parseFloat(compareAtPrice);
    if (cap > p) {
      discountPercent = Math.round(((cap - p) / cap) * 100);
    }
  }

  const { src, srcSet } = getShopifyImage(
    resource,
    '600',
    currentDisplayVariant?.id
  );

  const handleAction = () => {
    const queueUpdates: CartAction[] = [
      {
        resourceId: resource.id,
        gid: product?.id,
        variantId: !hasModeOption ? variantShipped?.id : undefined,
        variantIdShipped: hasModeOption ? variantShipped?.id : undefined,
        variantIdPickup: hasModeOption ? variantPickup?.id : undefined,
        action: 'add',
        boundResourceId: boundServiceResource?.id,
      },
    ];
    addQueue.set([...addQueue.get(), ...queueUpdates]);
  };

  return (
    <div className="group flex flex-col text-left font-main">
      {/* Clickable Area: Image and Title */}
      <button
        onClick={handleAction}
        className="text-left focus:outline-none"
        aria-label={`Add ${resource.title} to cart`}
      >
        {/* Rounded-2xl Frame with Top-Left Badge */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-brand-8 transition-opacity group-hover:opacity-90">
          <img
            src={src}
            srcSet={srcSet}
            alt={resource.title}
            className="h-full w-full object-cover object-center"
            loading="lazy"
          />
          {discountPercent > 0 && (
            <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-md bg-rose-600 text-xs font-bold text-white shadow-sm">
              -{discountPercent}%
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col">
          {/* Vendor Label */}
          {vendor && (
            <span className="text-xs font-bold uppercase tracking-widest text-brand-6">
              {vendor}
            </span>
          )}

          <h3 className="mt-1 text-2xl font-bold text-brand-1">
            {resource.title}
          </h3>

          {/* Combined Price Baseline */}
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-lg font-bold text-brand-1">
              {price} {currency}
            </span>
            {discountPercent > 0 && (
              <span className="text-sm text-brand-6 line-through">
                {compareAtPrice} {currency}
              </span>
            )}
          </div>

          <p className="mt-3 text-sm text-brand-7">{resource.oneliner}</p>
        </div>
      </button>

      {/* Interactive Variant Selectors */}
      {visibleOptions.length > 0 && (
        <div className="mt-4 space-y-4">
          {visibleOptions.map((opt) => (
            <div key={opt.name} onClick={(e) => e.stopPropagation()}>
              <label className="mb-1 block text-xs font-bold uppercase text-brand-7">
                {opt.name}
              </label>
              <select
                value={selections[opt.name]}
                onChange={(e) =>
                  setSelections((prev) => ({
                    ...prev,
                    [opt.name]: e.target.value,
                  }))
                }
                className="block w-full border-b border-brand-8 bg-transparent py-2 text-sm text-brand-1 focus:border-brand-1 focus:outline-none"
              >
                {opt.values.map((val) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {boundServiceResource && (
        <div className="bg-brand-4/10 mt-4 w-fit rounded px-2 py-1 text-xs font-bold text-brand-4">
          INCLUDES {boundServiceResource.title.toUpperCase()}
        </div>
      )}
    </div>
  );
}

const HEX_BG_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default function ShopifyProductGrid({ resources = {}, options }: Props) {
  let products = resources['product'] || [];
  const services = resources['service'] || [];

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
  } catch (e) {}

  if (group) {
    products = products.filter((p) => p.optionsPayload?.group === group);
  }

  if (products.length === 0) return null;

  return (
    <section className="w-full">
      <div
        className="flex w-full flex-col gap-12 p-12 md:gap-14 md:p-12 xl:gap-16 xl:p-16"
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
          <div className="grid grid-cols-2 gap-x-8 gap-y-16 md:gap-x-12 xl:grid-cols-3">
            {products.map((resource) => (
              <ProductCard
                key={resource.id}
                resource={resource}
                allServices={services}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

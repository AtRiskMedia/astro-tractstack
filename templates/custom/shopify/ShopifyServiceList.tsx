import { useStore } from '@nanostores/react';
import { cartStore, addQueue, type CartAction } from '@/stores/shopify';
import type { ResourceNode } from '@/types/compositorTypes';

interface Props {
  resources: ResourceNode[];
}

export default function ShopifyServiceList({ resources = [] }: Props) {
  const cart = useStore(cartStore);

  const handleToggle = (resourceId: string, currentQuantity: number) => {
    const actionType = currentQuantity > 0 ? 'remove' : 'add';
    const newAction: CartAction = {
      resourceId,
      action: actionType,
    };
    addQueue.set([...addQueue.get(), newAction]);
  };

  if (!resources || resources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {resources.map((resource) => {
        const cartItem = cart[resource.id];
        const isSelected = (cartItem?.quantity || 0) > 0;
        const duration = resource.optionsPayload?.bookingLengthMinutes;

        return (
          <div
            key={resource.id}
            className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
              isSelected
                ? 'border-black bg-gray-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{resource.title}</h3>
                {duration && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {duration} mins
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">{resource.oneliner}</p>
            </div>

            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() =>
                  handleToggle(resource.id, cartItem?.quantity || 0)
                }
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSelected ? 'bg-black' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={isSelected}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isSelected ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

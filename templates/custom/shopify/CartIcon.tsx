import { useStore } from '@nanostores/react';
import { cartStore } from '@/stores/shopify';

export default function CartIcon() {
  const cart = useStore(cartStore);
  const cartValues = Object.values(cart);
  const boundServiceIds = new Set(
    cartValues.map((item) => item.boundResourceId).filter(Boolean)
  );
  const totalQuantity = cartValues
    .filter((item) => !boundServiceIds.has(item.resourceId))
    .reduce((total, item) => total + item.quantity, 0);

  const handleOpenCart = () => {
    window.location.href = '/cart';
  };

  if (totalQuantity === 0) {
    return null;
  }

  return (
    <button
      onClick={handleOpenCart}
      className="relative flex items-center justify-center rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100"
      aria-label="Open Cart"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs font-bold text-white ring-2 ring-white">
        {totalQuantity}
      </span>
    </button>
  );
}

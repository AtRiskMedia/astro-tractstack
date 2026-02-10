import { useStore } from '@nanostores/react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { modalState } from '@/stores/shopify';

export default function CartModal() {
  const state = useStore(modalState);

  const handleClose = () => {
    modalState.set({ ...state, isOpen: false });
  };

  const handleAccept = () => {
    modalState.set({ ...state, isOpen: false });
    window.location.href = '/cart';
  };

  if (!state.isOpen) return null;

  const isCartPage =
    typeof window !== 'undefined' && window.location.pathname === '/cart';

  return (
    <Dialog.Root
      open={state.isOpen}
      onOpenChange={(e) => !e.open && handleClose()}
    >
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black bg-opacity-75 backdrop-blur-sm" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <Dialog.Title className="text-xl font-bold text-gray-900">
                {state.title}
              </Dialog.Title>

              <div className="mt-4 text-gray-600">
                <p>{state.message}</p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-300"
                >
                  {isCartPage ? 'Close' : 'Continue Shopping'}
                </button>
                {!isCartPage && (
                  <button
                    onClick={handleAccept}
                    className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
                  >
                    View Cart
                  </button>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

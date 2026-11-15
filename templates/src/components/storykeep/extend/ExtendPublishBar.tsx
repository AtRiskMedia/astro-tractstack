/**
 * Bottom alert patterned on UnsavedChangesBar (Dashboard_Advanced / Branding):
 * fixed amber bar after source files are saved this session.
 */
export default function ExtendPublishBar({
  show,
  isDev,
  onDismiss,
}: {
  show: boolean;
  isDev: boolean;
  onDismiss: () => void;
}) {
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 translate-y-0 transform pr-12 opacity-100 transition-all duration-300 ease-in-out">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" />
      <div className="relative mx-auto max-w-7xl px-4 py-4 md:px-6 xl:px-8">
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 text-amber-600">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-amber-800">
              {isDev
                ? 'Source changes saved this session (live via HMR on astro dev).'
                : 'Source changes are saved but not in the running bundle yet. Use Rebuild site under Build when ready.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-800 shadow-sm hover:bg-amber-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

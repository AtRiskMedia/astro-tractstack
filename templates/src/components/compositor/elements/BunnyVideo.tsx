interface BunnyVideoProps {
  videoId: string;
  title: string;
  className?: string;
}

const BUNNY_EMBED_BASE_URL = 'https://iframe.mediadelivery.net/embed/';

const BunnyVideo = ({ videoId, title, className = '' }: BunnyVideoProps) => {
  // If no videoId is provided, render the placeholder.
  if (!videoId) {
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center bg-gray-100 ${className}`}
      >
        <div className="p-4 text-center">
          <div className="text-mydarkgrey mb-2">Video ID not set</div>
          <div className="text-mygrey text-sm">
            Configure this widget with a valid Bunny Video ID
          </div>
        </div>
      </div>
    );
  }

  // Build the full, final URL from the videoId.
  let finalVideoUrl;
  try {
    const baseURL = `${BUNNY_EMBED_BASE_URL}${videoId}`;
    const videoUrl = new URL(baseURL);
    videoUrl.searchParams.set('autoplay', '0');
    videoUrl.searchParams.set('preload', 'false');
    videoUrl.searchParams.set('responsive', 'true');
    finalVideoUrl = videoUrl.toString();
  } catch (e) {
    // This handles cases where a malformed videoId might be passed.
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center bg-gray-100 ${className}`}
      >
        <div className="text-mydarkgrey text-center">Invalid Video ID</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <iframe
        src={finalVideoUrl}
        className="aspect-video w-full"
        title={title}
        allow="autoplay; fullscreen"
      />
    </div>
  );
};

export default BunnyVideo;

interface BunnyVideoProps {
  embedUrl: string;
  title: string;
  className?: string;
}

const BunnyVideo = ({ embedUrl, title, className = '' }: BunnyVideoProps) => {
  // Check if a string is a valid URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Render placeholder when URL is invalid
  if (!isValidUrl(embedUrl)) {
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center bg-gray-100 ${className}`}
      >
        <div className="p-4 text-center">
          <div className="text-mydarkgrey mb-2">Video URL not set</div>
          <div className="text-mygrey text-sm">
            Configure this widget with a valid Bunny Stream URL
          </div>
        </div>
      </div>
    );
  }

  // Build URL with default parameters for preview
  let videoUrl;
  try {
    videoUrl = new URL(embedUrl);
    videoUrl.searchParams.set('autoplay', '0');
    videoUrl.searchParams.set('preload', 'false');
    videoUrl.searchParams.set('responsive', 'true');
  } catch (e) {
    return (
      <div
        className={`flex aspect-video w-full items-center justify-center bg-gray-100 ${className}`}
      >
        <div className="text-mydarkgrey text-center">Invalid video URL</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <iframe
        src={videoUrl.toString()}
        className="aspect-video w-full"
        title={title}
        allow="autoplay; fullscreen"
      />
    </div>
  );
};

export default BunnyVideo;

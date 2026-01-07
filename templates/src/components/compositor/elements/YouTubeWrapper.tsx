export const YouTubeWrapper = ({
  embedCode,
  title,
}: {
  embedCode: string;
  title: string;
}) => {
  return (
    <div
      className="relative w-full min-w-80"
      style={{
        paddingBottom: '56.25%', // Maintains 16:9 aspect ratio
      }}
    >
      <iframe
        src={`https://www.youtube.com/embed/${embedCode}`}
        title={title}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
